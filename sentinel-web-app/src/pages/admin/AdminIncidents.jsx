import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { useGeoEngine } from '../../hooks/useGeoEngine';
import { useAuth } from '../../contexts/AuthContext';
import { HOTSPOT_ICONS } from '../../data/demoData';

export default function AdminIncidents() {
  const { currentUser } = useAuth();
  const engine = useGeoEngine({ lat: 22.5800, lon: 88.4650 }, { enabled: true, userId: currentUser?.uid });
  const [geoAlerts, setGeoAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('violations'); // violations or hotspots

  useEffect(() => {
    const alertRef = ref(db, 'geo_alerts');
    const unsub = onValue(alertRef, (snap) => {
      const data = snap.val();
      if (!data) { setGeoAlerts([]); return; }
      setGeoAlerts(Object.entries(data).map(([id, a]) => ({ id, ...a })).sort((a,b) => b.timestamp - a.timestamp));
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-on-surface mb-6">Incident Management</h2>
      
      <div className="flex border-b border-surface-container mb-6">
        <button 
          onClick={() => setActiveTab('violations')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'violations' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
        >
          Zone Violations ({geoAlerts.length})
        </button>
        <button 
          onClick={() => setActiveTab('hotspots')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'hotspots' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
        >
          Incident Hotspots ({engine.hotspots.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'violations' && (
          <div className="flex flex-col gap-3">
            {geoAlerts.length === 0 ? (
              <p className="text-on-surface-variant p-4">No violations recorded.</p>
            ) : (
              geoAlerts.map(alert => (
                <div key={alert.id} className="bg-white rounded-xl p-4 card-shadow border border-surface-container flex items-start gap-4">
                  <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    alert.severity === 'critical' ? 'bg-error' : alert.severity === 'warning' ? 'bg-[#eab308]' : 'bg-primary'
                  }`}>
                    <span className="material-symbols-outlined">{alert.type === 'zone_entry' ? 'login' : 'logout'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface text-lg">{alert.message}</p>
                    <p className="text-sm text-on-surface-variant mb-2">Device: {alert.deviceId}</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-outline uppercase tracking-wider">
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded ${alert.severity === 'critical' ? 'bg-error/10 text-error' : 'bg-[#eab308]/10 text-[#eab308]'}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'hotspots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engine.hotspots.map(hs => (
              <div key={hs.id} className="bg-white rounded-xl p-5 card-shadow border border-surface-container flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{HOTSPOT_ICONS[hs.type] || '🔥'}</div>
                  <div>
                    <p className="font-bold text-on-surface capitalize text-lg">{hs.type.replace('_', ' ')}</p>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      hs.severity === 'high' ? 'bg-error/10 text-error' : hs.severity === 'medium' ? 'bg-[#eab308]/10 text-[#eab308]' : 'bg-[#22c55e]/10 text-[#22c55e]'
                    }`}>
                      {hs.severity} Severity
                    </span>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant mb-4 flex-1">{hs.description}</p>
                <div className="flex justify-between items-center text-xs text-outline font-bold border-t border-surface-container pt-3">
                  <span>{hs.incidentCount} Historical Reports</span>
                  <span>Lat: {hs.lat.toFixed(3)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
