import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGeoEngine } from '../../hooks/useGeoEngine';
import DemoController from '../../components/DemoController';
import { ZONE_COLORS, getRiskLevel, HOTSPOT_ICONS, ROUTE_STATUS, DEMO_ROUTES } from '../../data/demoData';
import { fetchRoute } from '../../services/routingService';

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

export default function AdminMap() {
  const { currentUser } = useAuth();
  const [adminLoc, setAdminLoc] = useState(null);

  useEffect(() => {
    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setAdminLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.warn('AdminMap GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  const engine = useGeoEngine(adminLoc || { lat: 22.5800, lon: 88.4650 }, { enabled: true, userId: currentUser?.uid });
  const [sosAlerts, setSosAlerts] = useState([]);
  const [filters, setFilters] = useState({
    tourists: true, safeZones: true, cautionZones: true, restrictedZones: true, incidents: true, emergencies: true,
  });
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);

  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (!data) { setSosAlerts([]); return; }
      const active = Object.entries(data).filter(([_, a]) => a.active === true).map(([id, a]) => ({ id, ...a }));
      setSosAlerts(active);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const demoRoute = DEMO_ROUTES[0];
    if (demoRoute) {
      fetchRoute(demoRoute.waypoints).then((r) => setRouteCoords(r.coordinates)).catch(() => setRouteCoords(demoRoute.waypoints));
    }
  }, []);

  function toggleFilter(key) { setFilters((p) => ({ ...p, [key]: !p[key] })); }

  const center = adminLoc ? [adminLoc.lat, adminLoc.lon] : [22.5800, 88.4650];

  return (
    <div className="absolute inset-0 bg-surface-container-lowest">
      {!adminLoc && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none">
          <div className="bg-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-primary animate-spin">sync</span>
            <p className="text-on-surface font-bold">Acquiring Command Center Location...</p>
          </div>
        </div>
      )}

      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={true}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

        {adminLoc && (
          <Marker position={center} icon={createTouristIcon(0, false)}>
            <Popup>
              <strong>💻 Command Center (Laptop)</strong><br />
              This location is based on your browser's GPS/IP data.
            </Popup>
          </Marker>
        )}
        
        {engine.geoFences.map((gf) => {
          if (gf.type === 'safe' && !filters.safeZones) return null;
          if (gf.type === 'caution' && !filters.cautionZones) return null;
          if (gf.type === 'restricted' && !filters.restrictedZones) return null;
          const colors = ZONE_COLORS[gf.type] || ZONE_COLORS.safe;
          return (
            <Polygon
              key={gf.id}
              positions={gf.coordinates.map(([lat, lon]) => [lat, lon])}
              pathOptions={{ color: colors.stroke, fillColor: colors.fill, fillOpacity: colors.fillOpacity, weight: 2 }}
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

        {routeCoords && (
          <Polyline positions={routeCoords} pathOptions={{ color: '#0051df', weight: 4, dashArray: '10,6', opacity: 0.7 }} />
        )}

        {filters.tourists && engine.tourists.map((t) => (
          <Marker key={t.id} position={[t.lat, t.lon]} icon={createTouristIcon(t.riskScore, t.sos)} eventHandlers={{ click: () => setSelectedTourist(t) }}>
            <Popup>
              <strong>{t.name}</strong> ({t.id})<br />
              Risk: {t.riskScore}/100<br />
              {t.sos && <span style={{ color: 'red', fontWeight: 'bold' }}>🚨 SOS ACTIVE</span>}
            </Popup>
          </Marker>
        ))}

        {filters.incidents && engine.hotspots.map((hs) => (
          <Marker key={hs.id} position={[hs.lat, hs.lon]} icon={createHotspotIcon(hs.type)}>
            <Popup>
              <strong>{hs.type.replace('_', ' ').toUpperCase()}</strong><br />
              Severity: {hs.severity}<br />
              Incidents: {hs.incidentCount}<br />
              {hs.description}
            </Popup>
          </Marker>
        ))}

        {filters.emergencies && sosAlerts.map((a) => {
          if (!a.lat || !a.lon) return null;
          return (
            <Circle key={a.id} center={[a.lat, a.lon]} radius={200} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15, weight: 2, dashArray: '5,5' }}>
              <Popup>
                <strong>🚨 Emergency Geo-Fence</strong><br />
                {a.userName || a.deviceId}<br />
                Type: {a.type}
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>

      {/* Legend & Filters */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 z-[400] w-48 border border-surface-container">
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
            <input type="checkbox" checked={filters[f.key]} onChange={() => toggleFilter(f.key)} className="accent-primary w-3.5 h-3.5" />
            <span className="text-xs font-medium text-on-surface">{f.label}</span>
          </label>
        ))}
      </div>

      {/* Selected Tourist Detail Panel */}
      {selectedTourist && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 z-[400] border border-surface-container animate-slide-up">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-on-surface">{selectedTourist.name}</h3>
              <p className="text-xs text-on-surface-variant">{selectedTourist.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: getRiskLevel(selectedTourist.riskScore).color }}>
                {selectedTourist.riskScore}/100
              </div>
              <button onClick={() => setSelectedTourist(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-surface-container-low rounded-lg p-2 text-center">
              <p className="text-[10px] text-outline">Battery</p>
              <p className={`text-sm font-bold ${selectedTourist.battery < 20 ? 'text-error' : 'text-on-surface'}`}>{selectedTourist.battery}%</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2 text-center">
              <p className="text-[10px] text-outline">GPS</p>
              <p className={`text-sm font-bold ${selectedTourist.gpsStatus === 'connected' ? 'text-[#22c55e]' : 'text-error'}`}>{selectedTourist.gpsStatus === 'connected' ? '✓' : '✗'}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2 text-center">
              <p className="text-[10px] text-outline">LoRa</p>
              <p className={`text-sm font-bold ${selectedTourist.loraStatus === 'connected' ? 'text-[#22c55e]' : 'text-error'}`}>{selectedTourist.loraStatus === 'connected' ? '✓' : '✗'}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2 text-center">
              <p className="text-[10px] text-outline">GSM</p>
              <p className={`text-sm font-bold ${selectedTourist.gsmStatus === 'connected' ? 'text-[#22c55e]' : 'text-error'}`}>{selectedTourist.gsmStatus === 'connected' ? '✓' : '✗'}</p>
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
              <span className={`font-bold ${selectedTourist.sos ? 'text-error' : 'text-[#22c55e]'}`}>{selectedTourist.sos ? 'ACTIVE' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Demo Controller (Hidden in production) */}
      <div className="hidden">
        <DemoController onLocationUpdate={(loc) => setAdminLoc(loc)} onStatusChange={() => {}} userLocation={adminLoc} />
      </div>
    </div>
  );
}
