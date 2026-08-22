/*
 * SentinelMesh — Nearby Alerts / Responder Mode Page
 * Reference: stitch_sentinel_mesh_safety_app/respond_mode
 *
 * Shows active SOS alerts from nearby users on a map.
 * Responders can accept and navigate to the victim.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import BottomNav from '../components/BottomNav';

// Fix default marker icons for Leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const sosIcon = new L.DivIcon({
  className: 'custom-sos-marker',
  html: `<div style="width:32px;height:32px;background:#ba1a1a;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(186,26,26,0.5);animation:pulse-ring-danger 1.5s infinite">
    <span style="color:white;font-size:16px;font-weight:bold">!</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function Alerts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Clear all alerts (for testing/debugging)
  const clearAllAlerts = async () => {
    try {
      await set(ref(db, 'sos_alerts'), null);
      await set(ref(db, 'geo_fences'), null); // also clear virtual geo-fences
      setAlerts([]);
    } catch (e) {
      console.error('Failed to clear alerts:', e);
    }
  };

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Listen to active SOS alerts
  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setAlerts([]);
        return;
      }

      const activeAlerts = Object.entries(data)
        .filter(([_, alert]) => alert.active === true)
        .map(([key, alert]) => ({
          id: key,
          ...alert,
        }));

      setAlerts(activeAlerts);
    });

    return () => unsub();
  }, []);

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function openNavigation(lat, lon) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  }
  const center = userLoc ? [userLoc.lat, userLoc.lon] : null;

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between px-5 py-4 bg-surface/80 backdrop-blur-md">
        <span className="text-xl font-bold text-primary">Nearby Emergencies</span>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAllAlerts}
            className="text-xs bg-error/10 text-error px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Clear All
          </button>
          <div className="bg-error/10 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            <span className="text-xs font-bold text-error">{alerts.length} Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        {/* Map */}
        <div className="w-full h-64 rounded-3xl overflow-hidden card-shadow mb-6 border border-surface-container">
          {userLoc && (
            <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {/* User position */}
              <Circle center={center} radius={50} pathOptions={{ color: '#0051df', fillColor: '#0051df', fillOpacity: 0.3 }} />
              {/* 1km radius */}
              <Circle center={center} radius={1000} pathOptions={{ color: '#0051df', fillColor: '#0051df', fillOpacity: 0.05, dashArray: '5,10' }} />
              {/* SOS alerts */}
              {alerts.map((alert) => (
                <div key={alert.id}>
                  {alert.lat && alert.lon && (
                    <Circle
                      center={[alert.lat, alert.lon]}
                      radius={200}
                      pathOptions={{
                        color: '#ef4444',
                        fillColor: '#ef4444',
                        fillOpacity: 0.2,
                        weight: 2,
                        dashArray: '5,5'
                      }}
                    />
                  )}
                  {alert.lat && alert.lon && (
                    <Marker position={[alert.lat, alert.lon]} icon={sosIcon}>
                      <Popup>
                        <strong>🚨 SOS Alert</strong><br />
                        Type: {alert.type}<br />
                        Device: {alert.deviceId}
                      </Popup>
                    </Marker>
                  )}
                </div>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Alert Cards */}
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-outline text-5xl mb-4">shield</span>
            <h2 className="text-lg font-semibold text-on-surface mb-2">All Clear</h2>
            <p className="text-on-surface-variant">No active emergencies in your area. Stay safe!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Active Alerts</h2>
            {alerts.map((alert) => {
              const dist = userLoc ? Math.round(getDistance(userLoc.lat, userLoc.lon, alert.lat, alert.lon)) : null;
              const eta = dist ? Math.max(1, Math.round(dist / 80 / 60)) : null;

              return (
                <div
                  key={alert.id}
                  className="bg-white rounded-3xl p-5 card-shadow border border-error/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-error material-symbols-filled">sos</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-error uppercase tracking-wider">
                          {alert.type || 'SOS Alert'}
                        </p>
                        <p className="font-semibold text-on-surface">
                          {alert.userName || `Device ${alert.deviceId}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(`tel:${alert.phone || ''}`)}
                      className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined material-symbols-filled">call</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-surface-container-low rounded-2xl p-3 text-center">
                      <p className="text-xs text-on-surface-variant">Distance</p>
                      <p className="text-xl font-bold text-primary">
                        {dist ? (dist > 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`) : '—'}
                      </p>
                    </div>
                    <div className="bg-surface-container-low rounded-2xl p-3 text-center">
                      <p className="text-xs text-on-surface-variant">ETA</p>
                      <p className="text-xl font-bold text-error">
                        {eta ? `${eta} min` : '—'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openNavigation(alert.lat, alert.lon)}
                    className="w-full h-12 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">navigation</span>
                    Navigate
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav active="alerts" />
    </div>
  );
}
