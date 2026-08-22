import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { useGeoEngine } from '../../hooks/useGeoEngine';
import { useAuth } from '../../contexts/AuthContext';
import { getRiskLevel } from '../../data/demoData';

export default function AdminOverview() {
  const { currentUser } = useAuth();
  const engine = useGeoEngine({ lat: 22.5800, lon: 88.4650 }, { enabled: true, userId: currentUser?.uid });

  const [sosAlerts, setSosAlerts] = useState([]);
  const [geoAlerts, setGeoAlerts] = useState([]);

  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (!data) { setSosAlerts([]); return; }
      setSosAlerts(Object.entries(data).map(([id, a]) => ({ id, ...a })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const alertRef = ref(db, 'geo_alerts');
    const unsub = onValue(alertRef, (snap) => {
      const data = snap.val();
      if (!data) { setGeoAlerts([]); return; }
      setGeoAlerts(Object.values(data));
    });
    return () => unsub();
  }, []);

  const totalTourists = engine.tourists.length;
  const activeTourists = engine.tourists.filter(t => t.gpsStatus === 'connected' || t.loraStatus === 'connected').length;
  const activeSOS = sosAlerts.filter(a => a.active === true).length;
  const resolvedSOS = sosAlerts.filter(a => a.active === false).length;
  const highRiskTourists = engine.tourists.filter(t => getRiskLevel(t.riskScore).label === 'HIGH RISK' || getRiskLevel(t.riskScore).label === 'CRITICAL').length;
  const recentViolations = geoAlerts.filter(a => a.timestamp > Date.now() - 24 * 60 * 60 * 1000).length; // last 24h

  const stats = [
    { label: 'Total Tourists', value: totalTourists, icon: 'group', color: 'text-[#0051df]', bg: 'bg-[#0051df]/10' },
    { label: 'Active Tourists', value: activeTourists, icon: 'wifi', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    { label: 'Active SOS Alerts', value: activeSOS, icon: 'emergency', color: 'text-error', bg: 'bg-error/10', alert: activeSOS > 0 },
    { label: 'High-Risk Tourists', value: highRiskTourists, icon: 'warning', color: 'text-[#f97316]', bg: 'bg-[#f97316]/10' },
    { label: 'Zone Violations (24h)', value: recentViolations, icon: 'gpp_bad', color: 'text-[#eab308]', bg: 'bg-[#eab308]/10' },
    { label: 'Resolved Incidents', value: resolvedSOS, icon: 'check_circle', color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-on-surface mb-6">Overview Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 card-shadow flex items-center gap-4 border ${stat.alert ? 'border-error animate-pulse' : 'border-surface-container'}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-outline uppercase tracking-wide">{stat.label}</p>
              <p className="text-3xl font-black text-on-surface">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 card-shadow border border-surface-container">
          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-error">emergency</span>
            Recent SOS Alerts
          </h3>
          {sosAlerts.filter(a => a.active).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-on-surface-variant font-medium">No active emergencies right now.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sosAlerts.filter(a => a.active).slice(0, 5).map(alert => (
                <div key={alert.id} className="flex justify-between items-center p-3 bg-error/5 rounded-xl border border-error/20">
                  <div>
                    <p className="font-bold text-error">{alert.type.toUpperCase()}</p>
                    <p className="text-sm text-on-surface-variant">{alert.userName || alert.deviceId}</p>
                  </div>
                  <span className="text-xs font-bold text-outline">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow border border-surface-container">
          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#eab308]">warning</span>
            Recent Geo-Fence Violations
          </h3>
          {geoAlerts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-on-surface-variant font-medium">No recent violations.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {geoAlerts.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5).map((alert, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-[#eab308]/5 rounded-xl border border-[#eab308]/20">
                  <div>
                    <p className="font-bold text-on-surface">{alert.message}</p>
                    <p className="text-sm text-on-surface-variant">{alert.deviceId}</p>
                  </div>
                  <span className="text-xs font-bold text-outline">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
