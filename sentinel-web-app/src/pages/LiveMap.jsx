/*
 * SentinelMesh — Tourist Live Map
 *
 * Unified map showing:
 * - Real-time location
 * - Safe, Caution, and Restricted Geo-Fences
 * - Route Planner (Safe Corridor) overlay
 * - Dynamic route deviation alerts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGeoEngine } from '../hooks/useGeoEngine';
import BottomNav from '../components/BottomNav';
import { fetchRoute } from '../services/routingService';
import { ZONE_COLORS, getRiskLevel } from '../data/demoData';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const touristIcon = new L.DivIcon({
  className: 'tourist-marker',
  html: `<div style="width:24px;height:24px;background:#0051df;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="color:white;font-size:12px">👤</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const startIcon = new L.DivIcon({
  className: 'start-marker',
  html: `<div style="width:32px;height:32px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="color:white;font-size:16px">A</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const endIcon = new L.DivIcon({
  className: 'end-marker',
  html: `<div style="width:32px;height:32px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="color:white;font-size:16px">B</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FlyToUser({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function LiveMap() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Tourist Location
  const [userLoc, setUserLoc] = useState(() => {
    const saved = localStorage.getItem('last_known_loc');
    return saved ? JSON.parse(saved) : null;
  });
  const [followUser, setFollowUser] = useState(false);

  // Route Planning State
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [placingMode, setPlacingMode] = useState(null); // 'start' | 'end' | null
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [corridorWidth, setCorridorWidth] = useState(100);
  const [routeLoading, setRouteLoading] = useState(false);

  // Geo Engine
  const geoEngine = useGeoEngine(userLoc, {
    enabled: true,
    userId: currentUser?.uid,
    routeCoords: routeCoords,
    corridorWidth: corridorWidth,
  });

  // Location Watcher
  useEffect(() => {
    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserLoc(loc);
          localStorage.setItem('last_known_loc', JSON.stringify(loc));
        },
        console.warn,
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  function handleMapClick(latlng) {
    if (placingMode === 'start') {
      setStartPoint(latlng);
      setPlacingMode('end');
    } else if (placingMode === 'end') {
      setEndPoint(latlng);
      setPlacingMode(null);
    }
  }

  // Calculate Route
  useEffect(() => {
    if (startPoint && endPoint && !placingMode) {
      setRouteLoading(true);
      fetchRoute([startPoint, endPoint])
        .then((res) => {
          setRouteCoords(res.coordinates);
        })
        .catch(console.error)
        .finally(() => setRouteLoading(false));
    }
  }, [startPoint, endPoint, placingMode]);

  function resetRoute() {
    setStartPoint(null);
    setEndPoint(null);
    setRouteCoords(null);
    setPlannerOpen(false);
    setPlacingMode(null);
  }

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden relative">
      {/* Dynamic Alert Overlays */}
      <div className="absolute top-4 left-4 right-4 z-[900] flex flex-col gap-2">
        {geoEngine.warning && (
          <div className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 backdrop-blur-md animate-slide-down ${
            geoEngine.warning.type === 'restricted' || geoEngine.warning.type === 'critical'
              ? 'bg-[#ef4444]/90 text-white'
              : geoEngine.warning.type === 'caution' || geoEngine.warning.type === 'route'
              ? 'bg-[#eab308]/90 text-black'
              : 'bg-primary/90 text-white'
          }`}>
            <span className="text-2xl">{geoEngine.warning.icon}</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider">{geoEngine.warning.title}</p>
              <p className="text-sm font-medium mt-0.5">{geoEngine.warning.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {!userLoc ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-lowest">
            <span className="material-symbols-outlined text-4xl text-primary animate-pulse mb-2">my_location</span>
            <p className="text-sm font-bold text-on-surface-variant animate-pulse">Waiting for live location...</p>
          </div>
        ) : (
          <MapContainer
            center={[userLoc.lat, userLoc.lon]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapClickHandler onMapClick={handleMapClick} enabled={!!placingMode} />
          {followUser && <FlyToUser center={[userLoc.lat, userLoc.lon]} />}

          {/* User Marker */}
          {userLoc && (
            <Marker position={[userLoc.lat, userLoc.lon]} icon={touristIcon}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {/* Geo-Fences */}
          {geoEngine.geoFences.map((gf) => {
            // Treat missing status as 'active' (for backward compatibility with older fences)
            if (gf.status === 'disabled') return null;
            if (!gf.coordinates || (gf.type !== 'critical' && gf.coordinates.length < 3)) return null;
            
            const colors = ZONE_COLORS[gf.type] || ZONE_COLORS.safe;
            
            if (gf.type === 'critical') {
              // SOS Critical Zones
              return (
                <Circle
                  key={gf.id}
                  center={gf.coordinates[0]}
                  radius={500}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 2, dashArray: '5,5' }}
                >
                  <Popup><strong>🚨 CRITICAL ZONE</strong><br/>Emergency reported nearby.</Popup>
                </Circle>
              );
            }

            // Normal Polygons
            return (
              <Polygon
                key={gf.id}
                positions={gf.coordinates.map(([lat, lon]) => [Number(lat), Number(lon)])}
                pathOptions={{
                  color: colors.stroke,
                  fillColor: colors.fill,
                  fillOpacity: colors.fillOpacity,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>{gf.name}</strong><br />
                  Type: {gf.type.toUpperCase()}<br />
                  {gf.description}
                </Popup>
              </Polygon>
            );
          })}

          {/* Planned Route & Corridor */}
          {routeCoords && (
            <>
              {/* Safety Corridor Background */}
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#22c55e', weight: corridorWidth / 2, opacity: 0.15 }}
              />
              {/* Exact Route Line */}
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#0051df', weight: 4, dashArray: '10,6', opacity: 0.9 }}
              />
            </>
          )}

          {/* Route Markers */}
          {startPoint && <Marker position={startPoint} icon={startIcon} />}
          {endPoint && <Marker position={endPoint} icon={endIcon} />}
        </MapContainer>
        )}

        {/* Floating Actions on Map */}
        <div className="absolute right-4 bottom-40 z-[900] flex flex-col gap-3">
          <button
            onClick={() => setFollowUser(true)}
            onBlur={() => setFollowUser(false)}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined material-symbols-filled text-[24px]">my_location</span>
          </button>
          <button
            onClick={() => {
              setPlannerOpen(!plannerOpen);
              if (!plannerOpen) setPlacingMode('start');
              else resetRoute();
            }}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
              plannerOpen ? 'bg-error text-white' : 'bg-primary text-white'
            }`}
          >
            <span className="material-symbols-outlined material-symbols-filled text-[24px]">
              {plannerOpen ? 'close' : 'route'}
            </span>
          </button>
        </div>

        {/* Route Planner Overlay */}
        {plannerOpen && (
          <div className="absolute left-4 right-4 bottom-24 z-[800] bg-white rounded-2xl p-4 shadow-2xl border border-surface-container animate-slide-up">
            <h3 className="font-bold text-on-surface flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">route</span>
              Safe Route Planner
            </h3>
            
            {placingMode === 'start' && (
              <div className="bg-primary-container text-on-primary-container px-3 py-2 rounded-lg text-sm font-semibold mb-3">
                👆 Click map to set START point
              </div>
            )}
            {placingMode === 'end' && (
              <div className="bg-error-container text-on-error-container px-3 py-2 rounded-lg text-sm font-semibold mb-3">
                👆 Click map to set DESTINATION
              </div>
            )}
            {routeLoading && (
              <p className="text-sm text-secondary font-semibold animate-pulse">Calculating safe route...</p>
            )}
            
            {!placingMode && routeCoords && (
              <>
                <div className="flex justify-between items-center mb-1 mt-2">
                  <span className="text-xs font-bold text-outline uppercase">Corridor Width</span>
                  <span className="text-sm font-bold text-primary">{corridorWidth}m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={corridorWidth}
                  onChange={(e) => setCorridorWidth(parseInt(e.target.value))}
                  className="w-full accent-primary mb-2"
                />
                <p className="text-[10px] text-outline mb-3">
                  You will be warned if you deviate from this corridor.
                </p>
                <div className="grid grid-cols-4 gap-1 text-[9px] font-bold uppercase tracking-wider text-center">
                  <div className="bg-[#22c55e]/20 text-[#16a34a] p-1 rounded">Safe<br/>On Route</div>
                  <div className="bg-[#eab308]/20 text-[#ca8a04] p-1 rounded">Warn<br/>Minor</div>
                  <div className="bg-[#f97316]/20 text-[#ea580c] p-1 rounded">Risk<br/>High</div>
                  <div className="bg-[#ef4444]/20 text-[#dc2626] p-1 rounded">Critical<br/>Danger</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav active="map" />
    </div>
  );
}
