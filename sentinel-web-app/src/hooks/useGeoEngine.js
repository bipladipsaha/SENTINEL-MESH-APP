/*
 * SentinelMesh — Geo Engine Hook
 *
 * Central engine that evaluates tourist location against:
 * - Geo-fences (entry/exit with debounce)
 * - Route deviation (persistent check before alerting)
 * - Group separation
 * - Tourist Risk Score calculation
 *
 * Integrates with Firebase for real-time data and alert dispatch.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as turf from '@turf/turf';
import { db } from '../firebase';
import { ref, onValue, set, push, get } from 'firebase/database';
import { getRiskLevel } from '../data/demoData';

// Make turf available globally for the routing service
if (typeof window !== 'undefined') {
  window.__turf = turf;
}

/**
 * Check if a [lat, lon] point is inside a polygon defined by coordinates.
 */
function isInsidePolygon(lat, lon, polygonCoords, type = 'safe') {
  if (type === 'critical' && polygonCoords.length === 1) {
    const dist = haversine(lat, lon, polygonCoords[0][0], polygonCoords[0][1]);
    return dist <= 500;
  }
  
  if (!polygonCoords || polygonCoords.length < 3) return false;

  const pt = turf.point([lon, lat]);
  // Close the polygon ring
  const ring = [...polygonCoords.map(([la, lo]) => [lo, la])];
  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push(ring[0]);
  }
  
  try {
    const poly = turf.polygon([ring]);
    return turf.booleanPointInPolygon(pt, poly);
  } catch (e) {
    return false;
  }
}

/**
 * Calculate haversine distance in meters.
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the perpendicular distance from a point to a route polyline.
 */
function distanceToRouteLine(lat, lon, routeCoords) {
  if (!routeCoords || routeCoords.length < 2) return Infinity;
  const pt = turf.point([lon, lat]);
  const line = turf.lineString(routeCoords.map(([la, lo]) => [lo, la]));
  const nearest = turf.nearestPointOnLine(line, pt, { units: 'meters' });
  return nearest.properties.dist;
}

// ============================================================
// RISK SCORE CALCULATOR
// ============================================================

function calculateRiskScore({
  currentZones,
  routeDeviation,
  hotspotProximity,
  groupSeparated,
  isNight,
  gsmStatus,
  loraStatus,
  battery,
  isSOS,
}) {
  let score = 0;
  const reasons = [];

  // Zone-based risk
  if (currentZones.some((z) => z.type === 'restricted')) {
    score += 30;
    reasons.push({ factor: 'Restricted Zone', points: 30 });
  } else if (currentZones.some((z) => z.type === 'caution')) {
    score += 20;
    reasons.push({ factor: 'Caution Zone', points: 20 });
  }

  // Route deviation
  if (routeDeviation === 'critical_deviation') {
    score += 25;
    reasons.push({ factor: 'Critical Route Deviation', points: 25 });
  } else if (routeDeviation === 'significant_deviation') {
    score += 15;
    reasons.push({ factor: 'Significant Route Deviation', points: 15 });
  } else if (routeDeviation === 'minor_deviation') {
    score += 5;
    reasons.push({ factor: 'Minor Route Deviation', points: 5 });
  }

  // Hotspot proximity
  if (hotspotProximity < 200) {
    score += 15;
    reasons.push({ factor: 'Incident Hotspot Nearby', points: 15 });
  } else if (hotspotProximity < 500) {
    score += 8;
    reasons.push({ factor: 'Incident Hotspot in Area', points: 8 });
  }

  // Group separation
  if (groupSeparated) {
    score += 10;
    reasons.push({ factor: 'Group Separation', points: 10 });
  }

  // Night travel
  if (isNight) {
    score += 10;
    reasons.push({ factor: 'Night Travel', points: 10 });
  }

  // Connectivity
  if (gsmStatus === 'disconnected') {
    score += 5;
    reasons.push({ factor: 'GSM Offline', points: 5 });
  }
  if (loraStatus === 'disconnected') {
    score += 5;
    reasons.push({ factor: 'LoRa Offline', points: 5 });
  }

  // Battery
  if (battery < 15) {
    score += 10;
    reasons.push({ factor: 'Critical Battery', points: 10 });
  } else if (battery < 30) {
    score += 5;
    reasons.push({ factor: 'Low Battery', points: 5 });
  }

  // SOS active
  if (isSOS) {
    score = Math.max(score, 90);
    reasons.push({ factor: 'SOS Active', points: 90 });
  }

  return { score: Math.min(score, 100), reasons };
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useGeoEngine(userLocation, options = {}) {
  const {
    enabled = true,
    userId = null,
    routeCoords = null,      // Array of [lat, lon] for planned route
    corridorWidth = 100,      // meters
    groupId = null,
  } = options;

  const [geoFences, setGeoFences] = useState([]);
  const [sosZones, setSosZones] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [groups, setGroups] = useState([]);

  // Current state
  const [currentZones, setCurrentZones] = useState([]);
  const [riskScore, setRiskScore] = useState({ score: 0, reasons: [] });
  const [routeStatus, setRouteStatus] = useState('on_route');
  const [routeDistance, setRouteDistance] = useState(0);
  const [warning, setWarning] = useState(null);
  const [groupSeparation, setGroupSeparation] = useState(null);
  const [nearestHotspotDist, setNearestHotspotDist] = useState(Infinity);

  // Debounce refs for zone transitions
  const prevZonesRef = useRef(new Set());
  const deviationTimerRef = useRef(null);
  const deviationStartRef = useRef(null);

  // Load geo-fences from Firebase
  useEffect(() => {
    const gfRef = ref(db, 'geo_fences');
    const unsub = onValue(gfRef, (snap) => {
      const data = snap.val();
      if (data) {
        const fences = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        setGeoFences(fences);
      } else {
        setGeoFences([]);
      }
    });
    return () => unsub();
  }, []);

  // Load SOS alerts to create virtual critical zones
  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (data) {
        const activeSos = Object.entries(data)
          .filter(([_, v]) => (v.active === true || v.active === 'true') && v.lat !== undefined && v.lon !== undefined)
          .map(([id, v]) => ({
            id: `virtual-sos-${id}`,
            name: `Emergency: ${v.userName || 'User'}`,
            type: 'critical',
            coordinates: [[Number(v.lat), Number(v.lon)]],
            status: 'active',
            timestamp: v.timestamp || Date.now()
          }));
        setSosZones(activeSos);
      } else {
        setSosZones([]);
      }
    });
    return () => unsub();
  }, []);

  // Load tourists from Firebase
  useEffect(() => {
    const tRef = ref(db, 'tourists');
    const unsub = onValue(tRef, (snap) => {
      const data = snap.val();
      if (data) {
        const fbTourists = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        setTourists(fbTourists);
      } else {
        setTourists([]);
      }
    });
    return () => unsub();
  }, []);

  // ====== MAIN EVALUATION LOOP ======
  useEffect(() => {
    if (!enabled || !userLocation) return;

    const { lat, lon } = userLocation;

    const allFences = [...geoFences, ...sosZones];

    // 1. Check geo-fences
    const insideZones = allFences.filter((gf) => {
      if (gf.status !== 'active') return false;
      return isInsidePolygon(lat, lon, gf.coordinates, gf.type);
    });
    setCurrentZones(insideZones);

    // 2. Zone transition detection (debounced)
    const currentZoneIds = new Set(insideZones.map((z) => z.id));
    const prevIds = prevZonesRef.current;

    // Entries
    for (const zone of insideZones) {
      if (!prevIds.has(zone.id)) {
        handleZoneEntry(zone);
      }
    }
    // Exits
    for (const prevId of prevIds) {
      if (!currentZoneIds.has(prevId)) {
        const exitedZone = allFences.find((g) => g.id === prevId);
        if (exitedZone) handleZoneExit(exitedZone);
      }
    }
    prevZonesRef.current = currentZoneIds;

    // 3. Route deviation
    if (routeCoords && routeCoords.length >= 2) {
      const dist = distanceToRouteLine(lat, lon, routeCoords);
      setRouteDistance(Math.round(dist));

      let status = 'on_route';
      if (dist > corridorWidth * 5) status = 'critical_deviation';
      else if (dist > corridorWidth * 2) status = 'significant_deviation';
      else if (dist > corridorWidth) status = 'minor_deviation';

      // Persistent deviation: only alert after 30 seconds of sustained deviation
      if (status !== 'on_route') {
        if (!deviationStartRef.current) {
          deviationStartRef.current = Date.now();
        }
        const elapsed = Date.now() - deviationStartRef.current;
        if (elapsed > 30000) {
          setRouteStatus(status);
        } else {
          setRouteStatus('on_route'); // still within grace period
        }
      } else {
        deviationStartRef.current = null;
        setRouteStatus('on_route');
      }
    }

    // 4. Hotspot proximity
    let minHotspotDist = Infinity;
    for (const hs of hotspots) {
      const d = haversine(lat, lon, hs.lat, hs.lon);
      if (d < minHotspotDist) minHotspotDist = d;
    }
    setNearestHotspotDist(Math.round(minHotspotDist));

    // 5. Group separation check
    if (groupId) {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        const memberLocs = tourists.filter(
          (t) => group.members.includes(t.id) && t.id !== userId
        );
        if (memberLocs.length > 0) {
          // Calculate group center
          const centerLat = memberLocs.reduce((s, m) => s + m.lat, 0) / memberLocs.length;
          const centerLon = memberLocs.reduce((s, m) => s + m.lon, 0) / memberLocs.length;
          const distFromGroup = haversine(lat, lon, centerLat, centerLon);

          if (distFromGroup > (group.maxSeparationDistance || 500)) {
            setGroupSeparation({
              distance: Math.round(distFromGroup),
              maxAllowed: group.maxSeparationDistance || 500,
            });
          } else {
            setGroupSeparation(null);
          }
        }
      }
    }

    // 6. Calculate risk score
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 20;

    const risk = calculateRiskScore({
      currentZones: insideZones,
      routeDeviation: routeStatus,
      hotspotProximity: minHotspotDist,
      groupSeparated: !!groupSeparation,
      isNight,
      gsmStatus: 'connected', // Will be overridden with real device data
      loraStatus: 'connected',
      battery: 100,
      isSOS: false,
    });
    setRiskScore(risk);

    // 7. Determine active warning
    if (insideZones.some((z) => z.type === 'restricted')) {
      setWarning({
        type: 'restricted',
        icon: '🚨',
        title: 'RESTRICTED AREA',
        message: 'You have entered a restricted or dangerous area. Please leave immediately.',
      });
    } else if (insideZones.some((z) => z.type === 'caution')) {
      setWarning({
        type: 'caution',
        icon: '⚠️',
        title: 'CAUTION ZONE',
        message: 'You have entered an area with elevated safety risk.',
      });
    } else if (routeStatus === 'critical_deviation' || routeStatus === 'significant_deviation') {
      setWarning({
        type: 'route',
        icon: '🛤️',
        title: 'ROUTE DEVIATION',
        message: `You are ${routeDistance}m from your planned route.`,
      });
    } else if (groupSeparation) {
      setWarning({
        type: 'group',
        icon: '👥',
        title: 'GROUP SEPARATION',
        message: `You are ${groupSeparation.distance}m from your group.`,
      });
    } else {
      setWarning(null);
    }
  }, [userLocation, geoFences, sosZones, hotspots, routeCoords, corridorWidth, enabled, tourists, groups, groupId]);

  // Zone entry handler — dispatch to Firebase alerts
  function handleZoneEntry(zone) {
    if (!userId) return;
    const alertData = {
      touristId: userId,
      type: 'zone_entry',
      severity: zone.type === 'restricted' ? 'critical' : zone.type === 'caution' ? 'warning' : 'info',
      message: `Entered ${zone.type.toUpperCase()} zone: ${zone.name}`,
      zoneName: zone.name,
      zoneType: zone.type,
      timestamp: Date.now(),
      status: 'active',
    };
    push(ref(db, 'geo_alerts'), alertData).catch(console.error);
  }

  // Zone exit handler
  function handleZoneExit(zone) {
    if (!userId) return;
    const alertData = {
      touristId: userId,
      type: 'zone_exit',
      severity: 'info',
      message: `Exited ${zone.type.toUpperCase()} zone: ${zone.name}`,
      zoneName: zone.name,
      zoneType: zone.type,
      timestamp: Date.now(),
      status: 'active',
    };
    push(ref(db, 'geo_alerts'), alertData).catch(console.error);
  }

  return {
    // State
    geoFences: [...geoFences, ...sosZones],
    hotspots,
    tourists,
    groups,
    currentZones,
    riskScore,
    routeStatus,
    routeDistance,
    warning,
    groupSeparation,
    nearestHotspotDist,

    // Setters (for simulation)
    setGeoFences,
    setTourists,
    setGroups,
  };
}
