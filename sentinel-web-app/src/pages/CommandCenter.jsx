/*
 * SentinelMesh — Admin Command Center
 *
 * Full-screen map dashboard for administrators.
 * Shows live tourists, geo-fences, incidents, emergencies,
 * with filters, legend, tourist detail panel, and emergency controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGeoEngine } from '../hooks/useGeoEngine';
import DemoController from '../components/DemoController';
import {
  ZONE_COLORS,
  getRiskLevel,
  RISK_LEVELS,
  HOTSPOT_ICONS,
  ROUTE_STATUS,
  DEMO_ROUTES,
} from '../data/demoData';
import { fetchRoute } from '../services/routingService';
import { verifyIncidentIntegrity, logResponseAction } from '../services/blockchain';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createTouristIcon(riskScore, isSOS) {
  const level = getRiskLevel(riskScore);
  const bg = isSOS ? '#ef4444' : level.color;
  const pulse = isSOS ? 'animation:pulse-ring-danger 1.5s infinite;' : '';
  return new L.DivIcon({
    className: 'tourist-marker',
    html: `<div style="width:28px;height:28px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px ${bg}60;${pulse}"><span style="color:white;font-size:12px;font-weight:bold">👤</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createHotspotIcon(type) {
  const emoji = HOTSPOT_ICONS[type] || '🔥';
  return new L.DivIcon({
    className: 'hotspot-marker',
    html: `<div style="width:30px;height:30px;background:#ff6b3560;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #ff6b35">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, []);
  return null;
}

export default function CommandCenter() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Live admin location
  const [adminLoc, setAdminLoc] = useState(null);

  useEffect(() => {
    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setAdminLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => console.warn('CommandCenter GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Geo engine
  const engine = useGeoEngine(adminLoc || { lat: 22.5800, lon: 88.4650 }, { enabled: true, userId: currentUser?.uid });

  // Active SOS alerts from Firebase
  const [sosAlerts, setSosAlerts] = useState([]);

  // Map filters
  const [filters, setFilters] = useState({
    tourists: true,
    safeZones: true,
    cautionZones: true,
    restrictedZones: true,
    incidents: true,
    emergencies: true,
  });

  // Selected tourist
  const [selectedTourist, setSelectedTourist] = useState(null);

  // Panel tab
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'emergencies' | 'tourists'

  // Fetched route for display
  const [routeCoords, setRouteCoords] = useState(null);

  // Geo alerts
  const [geoAlerts, setGeoAlerts] = useState([]);

  // Load SOS alerts from Firebase
  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (!data) { setSosAlerts([]); return; }
      const active = Object.entries(data)
        .filter(([_, a]) => a.active === true)
        .map(([id, a]) => ({ id, ...a }));
      setSosAlerts(active);
    });
    return () => unsub();
  }, []);

  // Load geo alerts from Firebase
  useEffect(() => {
    const alertRef = ref(db, 'geo_alerts');
    const unsub = onValue(alertRef, (snap) => {
      const data = snap.val();
      if (!data) { setGeoAlerts([]); return; }
      const list = Object.entries(data)
        .map(([id, a]) => ({ id, ...a }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
      setGeoAlerts(list);
    });
    return () => unsub();
  }, []);

  // Fetch OSRM route for demo
  useEffect(() => {
    const demoRoute = DEMO_ROUTES[0];
    if (demoRoute) {
      fetchRoute(demoRoute.waypoints)
        .then((r) => setRouteCoords(r.coordinates))
        .catch(() => setRouteCoords(demoRoute.waypoints)); // fallback to straight lines
    }
  }, []);

  function toggleFilter(key) {
    setFilters((p) => ({ ...p, [key]: !p[key] }));
  }

  async function resolveEmergency(alertId) {
    try {
      await update(ref(db, `sos_alerts/${alertId}`), { active: false });
      // Log "resolved" action to blockchain audit trail
      logResponseAction(alertId, 'resolved').then(res => {
        if (res?.txHash) console.log('Audit TX (resolved):', res.txHash);
      });
    } catch (e) {
      console.error('Failed to resolve:', e);
    }
  }

  // Blockchain Verification State
  const [verificationResults, setVerificationResults] = useState({});

  const handleVerifyIntegrity = async (alert) => {
    setVerificationResults(prev => ({ ...prev, [alert.id]: { loading: true } }));
    // Backend fetches from Firebase, re-hashes, and compares to blockchain
    const result = await verifyIncidentIntegrity(alert.id);
    setVerificationResults(prev => ({ ...prev, [alert.id]: { loading: false, ...result } }));
  };

  const center = adminLoc ? [adminLoc.lat, adminLoc.lon] : null;

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-surface-container z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-on-surface-variant">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-lg font-bold text-primary">Command Center</span>
          <span className="bg-secondary/10 text-secondary text-xs font-bold px-2 py-0.5 rounded-full">ADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          {sosAlerts.length > 0 && (
            <div className="bg-error/10 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-error" />
              <span className="text-xs font-bold text-error">{sosAlerts.length} SOS</span>
            </div>
          )}
          <button
            onClick={() => navigate('/admin/geofences')}
            className="h-9 px-3 bg-primary/10 text-primary rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">hexagon</span>
            Geo-Fences
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-surface-container bg-white">
        {[
          { id: 'map', icon: 'map', label: 'Live Map' },
          { id: 'emergencies', icon: 'emergency', label: `Emergencies (${sosAlerts.length})` },
          { id: 'tourists', icon: 'group', label: `Tourists (${engine.tourists.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'map' && (
          <>
            {/* Map */}
            <div className="absolute inset-0">
              {!adminLoc ? (
                <div className="w-full h-full flex items-center justify-center bg-surface-container-lowest">
                  <p className="text-on-surface-variant font-bold animate-pulse">Locating Command Center...</p>
                </div>
              ) : (
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

                  {/* Admin Location (Laptop) */}
                  <Marker position={center} icon={createTouristIcon(0, false)}>
                    <Popup>
                      <strong>💻 Command Center (Laptop)</strong><br />
                      This location is based on your browser's GPS/IP data.
                    </Popup>
                  </Marker>
                  
                  {/* Geo-fence Polygons */}
                {engine.geoFences.map((gf) => {
                  if (gf.type === 'safe' && !filters.safeZones) return null;
                  if (gf.type === 'caution' && !filters.cautionZones) return null;
                  if (gf.type === 'restricted' && !filters.restrictedZones) return null;

                  const colors = ZONE_COLORS[gf.type] || ZONE_COLORS.safe;
                  const positions = gf.coordinates.map(([lat, lon]) => [lat, lon]);

                  return (
                    <Polygon
                      key={gf.id}
                      positions={positions}
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
                        Risk: {gf.riskLevel}/100<br />
                        {gf.description}
                      </Popup>
                    </Polygon>
                  );
                })}

                {/* Planned Route */}
                {routeCoords && (
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{ color: '#0051df', weight: 4, dashArray: '10,6', opacity: 0.7 }}
                  />
                )}

                {/* Tourist Markers */}
                {filters.tourists && engine.tourists.map((t) => (
                  <Marker
                    key={t.id}
                    position={[t.lat, t.lon]}
                    icon={createTouristIcon(t.riskScore, t.sos)}
                    eventHandlers={{ click: () => setSelectedTourist(t) }}
                  >
                    <Popup>
                      <strong>{t.name}</strong> ({t.id})<br />
                      Risk: {t.riskScore}/100<br />
                      Battery: {t.battery}%<br />
                      {t.sos && <span style={{ color: 'red', fontWeight: 'bold' }}>🚨 SOS ACTIVE</span>}
                    </Popup>
                  </Marker>
                ))}

                {/* Hotspot Markers */}
                {filters.incidents && engine.hotspots.map((hs) => (
                  <Marker
                    key={hs.id}
                    position={[hs.lat, hs.lon]}
                    icon={createHotspotIcon(hs.type)}
                  >
                    <Popup>
                      <strong>{hs.type.replace('_', ' ').toUpperCase()}</strong><br />
                      Severity: {hs.severity}<br />
                      Incidents: {hs.incidentCount}<br />
                      {hs.description}
                    </Popup>
                  </Marker>
                ))}

                {/* SOS Emergency Circles */}
                {filters.emergencies && sosAlerts.map((a) => {
                  if (!a.lat || !a.lon) return null;
                  return (
                  <Circle
                    key={a.id}
                    center={[a.lat, a.lon]}
                    radius={200}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: '5,5',
                    }}
                  >
                    <Popup>
                      <strong>🚨 Emergency Geo-Fence</strong><br />
                      {a.userName || a.deviceId}<br />
                      Type: {a.type}
                    </Popup>
                  </Circle>
                  );
                })}
              </MapContainer>
              )}
            </div>

            {/* Legend & Filters */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 z-[400] w-48">
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Map Filters</p>
              {[
                { key: 'tourists', label: '👤 Tourists', color: '#0051df' },
                { key: 'safeZones', label: '🟢 Safe Zones', color: '#22c55e' },
                { key: 'cautionZones', label: '🟡 Caution Zones', color: '#eab308' },
                { key: 'restrictedZones', label: '🔴 Restricted Zones', color: '#ef4444' },
                { key: 'incidents', label: '🔥 Incidents', color: '#f97316' },
                { key: 'emergencies', label: '🚨 SOS Alerts', color: '#dc2626' },
              ].map((f) => (
                <label key={f.key} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters[f.key]}
                    onChange={() => toggleFilter(f.key)}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  <span className="text-xs font-medium text-on-surface">{f.label}</span>
                </label>
              ))}
            </div>

            {/* Selected Tourist Detail Panel */}
            {selectedTourist && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 z-[400] max-w-md mx-auto animate-slide-up">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-on-surface">{selectedTourist.name}</h3>
                    <p className="text-xs text-on-surface-variant">{selectedTourist.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: getRiskLevel(selectedTourist.riskScore).color }}
                    >
                      {selectedTourist.riskScore}/100
                    </div>
                    <button onClick={() => setSelectedTourist(null)} className="text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-surface-container-low rounded-lg p-2 text-center">
                    <p className="text-[10px] text-outline">Battery</p>
                    <p className={`text-sm font-bold ${selectedTourist.battery < 20 ? 'text-error' : 'text-on-surface'}`}>
                      {selectedTourist.battery}%
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2 text-center">
                    <p className="text-[10px] text-outline">GPS</p>
                    <p className={`text-sm font-bold ${selectedTourist.gpsStatus === 'connected' ? 'text-[#22c55e]' : 'text-error'}`}>
                      {selectedTourist.gpsStatus === 'connected' ? '✓' : '✗'}
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2 text-center">
                    <p className="text-[10px] text-outline">LoRa</p>
                    <p className={`text-sm font-bold ${selectedTourist.loraStatus === 'connected' ? 'text-[#22c55e]' : 'text-error'}`}>
                      {selectedTourist.loraStatus === 'connected' ? '✓' : '✗'}
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2 text-center">
                    <p className="text-[10px] text-outline">GSM</p>
                    <p className={`text-sm font-bold ${selectedTourist.gsmStatus === 'connected' ? 'text-[#22c55e]' : 'text-error'}`}>
                      {selectedTourist.gsmStatus === 'connected' ? '✓' : '✗'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-outline">Zone:</span> <span className="font-semibold">{selectedTourist.currentZone || 'None'}</span></div>
                  <div><span className="text-outline">Route:</span> <span className="font-semibold">{ROUTE_STATUS[selectedTourist.routeStatus]?.label || 'N/A'}</span></div>
                  <div><span className="text-outline">Lat:</span> <span className="font-semibold">{selectedTourist.lat.toFixed(4)}</span></div>
                  <div><span className="text-outline">Lon:</span> <span className="font-semibold">{selectedTourist.lon.toFixed(4)}</span></div>
                  <div><span className="text-outline">Group:</span> <span className="font-semibold">{selectedTourist.groupId || 'Solo'}</span></div>
                  <div>
                    <span className="text-outline">SOS:</span>{' '}
                    <span className={`font-bold ${selectedTourist.sos ? 'text-error' : 'text-[#22c55e]'}`}>
                      {selectedTourist.sos ? 'ACTIVE' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Emergencies Tab */}
        {activeTab === 'emergencies' && (
          <div className="p-4 overflow-y-auto h-full">
            <h2 className="text-lg font-bold mb-4">Active Emergencies</h2>
            {sosAlerts.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-outline text-5xl mb-2">verified_user</span>
                <p className="text-on-surface-variant">No active emergencies</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sosAlerts.map((alert) => (
                  <div key={alert.id} className="bg-white rounded-2xl p-4 card-shadow border-l-4 border-error">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs font-bold text-error uppercase">{alert.type}</p>
                        <p className="font-bold text-on-surface">{alert.userName || alert.deviceId}</p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-error/10 text-error rounded-full text-xs font-bold">
                        CRITICAL
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div><span className="text-outline">Lat:</span> {alert.lat?.toFixed(4) || '—'}</div>
                      <div><span className="text-outline">Lon:</span> {alert.lon?.toFixed(4) || '—'}</div>
                      <div><span className="text-outline">Battery:</span> {alert.battery || '—'}%</div>
                      <div><span className="text-outline">Device:</span> {alert.deviceId}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyIntegrity(alert)}
                        className="flex-1 h-9 bg-surface-container-low text-on-surface rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                        disabled={verificationResults[alert.id]?.loading}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {verificationResults[alert.id]?.loading ? 'sync' : 'verified_user'}
                        </span>
                        Verify Integrity
                      </button>
                      <button
                        onClick={() => resolveEmergency(alert.id)}
                        className="flex-1 h-9 bg-[#22c55e]/10 text-[#16a34a] rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Resolve
                      </button>
                    </div>
                    {verificationResults[alert.id] && !verificationResults[alert.id].loading && (
                      <div className={`mt-2 p-2 rounded text-xs font-bold flex items-center gap-1 ${
                        verificationResults[alert.id].verified 
                          ? 'bg-[#22c55e]/20 text-[#16a34a]' 
                          : 'bg-error/20 text-error'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {verificationResults[alert.id].verified ? 'check_circle' : 'warning'}
                        </span>
                        {verificationResults[alert.id].verified ? '✓ VERIFIED: Data matches blockchain' : '⚠️ TAMPERED: Data mismatch'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Geo Alerts History */}
            {geoAlerts.length > 0 && (
              <>
                <h2 className="text-lg font-bold mt-6 mb-4">Recent Geo-Fence Alerts</h2>
                <div className="flex flex-col gap-2">
                  {geoAlerts.slice(0, 15).map((a) => (
                    <div key={a.id} className="bg-white rounded-xl p-3 card-shadow flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                        a.severity === 'critical' ? 'bg-error' : a.severity === 'warning' ? 'bg-[#eab308]' : 'bg-primary'
                      }`}>
                        {a.type === 'zone_entry' ? '→' : '←'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{a.message}</p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tourists Tab */}
        {activeTab === 'tourists' && (
          <div className="p-4 overflow-y-auto h-full">
            <h2 className="text-lg font-bold mb-4">All Tourists</h2>
            <div className="flex flex-col gap-3">
              {engine.tourists.map((t) => {
                const level = getRiskLevel(t.riskScore);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTourist(t); setActiveTab('map'); }}
                    className="bg-white rounded-2xl p-4 card-shadow flex items-center gap-3 text-left border border-surface-container hover:border-primary/30 transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: level.color }}
                    >
                      {t.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface">{t.name}</p>
                      <p className="text-xs text-on-surface-variant">{t.id} • {t.groupId || 'Solo'}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className="px-2 py-1 rounded-full text-xs font-bold text-white mb-1"
                        style={{ background: level.color }}
                      >
                        {t.riskScore}
                      </div>
                      <p className="text-[10px] text-on-surface-variant">{level.label}</p>
                    </div>
                    {t.sos && (
                      <span className="material-symbols-outlined text-error text-xl animate-pulse">sos</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Demo Controller */}
      <DemoController
        onLocationUpdate={(loc) => setAdminLoc(loc)}
        onStatusChange={() => {}}
        userLocation={adminLoc}
      />
    </div>
  );
}
