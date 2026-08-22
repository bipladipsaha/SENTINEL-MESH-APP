import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';
import { useGeoEngine } from '../../hooks/useGeoEngine';
import { useAuth } from '../../contexts/AuthContext';
import { getRiskLevel } from '../../data/demoData';

export default function AdminAnalytics() {
  const { currentUser } = useAuth();
  const engine = useGeoEngine({ lat: 22.5800, lon: 88.4650 }, { enabled: true, userId: currentUser?.uid });
  
  const [sosAlerts, setSosAlerts] = useState([]);

  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (data) {
        setSosAlerts(Object.values(data));
      } else {
        setSosAlerts([]);
      }
    });
    return () => unsub();
  }, []);

  // Compute Risk Distribution
  const riskCounts = { safe: 0, caution: 0, high: 0, critical: 0 };
  engine.tourists.forEach(t => {
    const risk = getRiskLevel(t.riskScore).label;
    if (risk === 'SAFE') riskCounts.safe++;
    else if (risk === 'CAUTION') riskCounts.caution++;
    else if (risk === 'HIGH RISK') riskCounts.high++;
    else riskCounts.critical++;
  });
  const totalTourists = engine.tourists.length || 1;

  // Compute SOS Types
  const sosTypes = {};
  sosAlerts.forEach(a => {
    sosTypes[a.type] = (sosTypes[a.type] || 0) + 1;
  });
  const totalSos = sosAlerts.length || 1;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-on-surface mb-6">Analytics & Reporting</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Distribution Chart */}
        <div className="bg-white rounded-2xl p-6 card-shadow border border-surface-container">
          <h3 className="font-bold text-on-surface mb-6 text-lg">Tourist Risk Distribution</h3>
          
          <div className="flex flex-col gap-4">
            {[
              { label: 'Safe', count: riskCounts.safe, color: 'bg-[#22c55e]' },
              { label: 'Caution', count: riskCounts.caution, color: 'bg-[#eab308]' },
              { label: 'High Risk', count: riskCounts.high, color: 'bg-[#f97316]' },
              { label: 'Critical', count: riskCounts.critical, color: 'bg-error' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm font-bold text-on-surface mb-1">
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                    style={{ width: `${(item.count / totalTourists) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SOS Frequency Chart */}
        <div className="bg-white rounded-2xl p-6 card-shadow border border-surface-container">
          <h3 className="font-bold text-on-surface mb-6 text-lg">SOS Incidents by Type</h3>
          
          {sosAlerts.length === 0 ? (
            <p className="text-on-surface-variant italic py-8 text-center">No SOS alerts recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(sosTypes).sort((a,b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm font-bold text-on-surface mb-1 uppercase">
                    <span>{type}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full bg-error/10 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-error rounded-full transition-all duration-1000" 
                      style={{ width: `${(count / totalSos) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
