import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { verifyIncidentIntegrity, logResponseAction } from '../../services/blockchain';

export default function AdminAlerts() {
  const navigate = useNavigate();
  const [sosAlerts, setSosAlerts] = useState([]);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (!data) { setSosAlerts([]); return; }
      const active = Object.entries(data)
        .filter(([_, a]) => a.active === true)
        .map(([id, a]) => ({ id, ...a }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setSosAlerts(active);
    });
    return () => unsub();
  }, []);

  async function resolveEmergency(alertId) {
    if (!window.confirm("Are you sure you want to resolve this emergency?")) return;
    try {
      await update(ref(db, `sos_alerts/${alertId}`), { active: false, status: 'Resolved' });
      logResponseAction(alertId, 'resolved').then(res => {
        if (res?.txHash) console.log('Audit TX (resolved):', res.txHash);
      });
    } catch (e) {
      console.error('Failed to resolve:', e);
    }
  }

  async function updateStatus(alertId, newStatus) {
    try {
      await update(ref(db, `sos_alerts/${alertId}`), { status: newStatus });
      logResponseAction(alertId, newStatus.toLowerCase()).then(res => {
        if (res?.txHash) console.log(`Audit TX (${newStatus}):`, res.txHash);
      });
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }

  const handleVerifyIntegrity = async (alert) => {
    setVerificationResults(prev => ({ ...prev, [alert.id]: { loading: true } }));
    const result = await verifyIncidentIntegrity(alert.id);
    setVerificationResults(prev => ({ ...prev, [alert.id]: { loading: false, ...result } }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-on-surface">Emergency Alerts</h2>
        {sosAlerts.length > 0 && (
          <div className="bg-error px-4 py-2 rounded-full text-white font-bold text-sm flex items-center gap-2 animate-pulse shadow-lg">
            <span className="material-symbols-outlined">warning</span>
            {sosAlerts.length} Active {sosAlerts.length === 1 ? 'Emergency' : 'Emergencies'}
          </div>
        )}
      </div>

      {sosAlerts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center card-shadow border border-surface-container flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-[#22c55e]/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#22c55e] text-4xl">verified_user</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">No Active Emergencies</h3>
          <p className="text-on-surface-variant max-w-sm">All tourists are currently safe and there are no active SOS alerts in the system.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sosAlerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-2xl p-5 card-shadow border-l-8 border-error flex flex-col md:flex-row gap-6">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-error/10 text-error px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider">
                    {alert.type} EMERGENCY
                  </span>
                  <span className="text-sm font-bold text-outline">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  <span className="bg-[#f97316]/10 text-[#f97316] px-2.5 py-1 rounded-md text-xs font-bold uppercase ml-auto md:ml-0">
                    Status: {alert.status || 'Active'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-on-surface mb-1">
                  {alert.userName || `Device: ${alert.deviceId}`}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-outline text-xs uppercase font-bold mb-1">Location</p>
                    <p className="font-mono bg-surface-container px-2 py-1 rounded text-on-surface inline-block">
                      {alert.lat?.toFixed(5) || 'Unknown'}, {alert.lon?.toFixed(5) || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-outline text-xs uppercase font-bold mb-1">Device Status</p>
                    <p className="font-semibold text-on-surface">Battery: {alert.battery || '—'}%</p>
                  </div>
                </div>

                {verificationResults[alert.id] && !verificationResults[alert.id].loading && (
                  <div className={`mt-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
                    verificationResults[alert.id].verified 
                      ? 'bg-[#22c55e]/10 text-[#16a34a] border border-[#22c55e]/20' 
                      : 'bg-error/10 text-error border border-error/20'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {verificationResults[alert.id].verified ? 'check_circle' : 'warning'}
                    </span>
                    {verificationResults[alert.id].verified ? 'Blockchain Verification Passed: Data is authentic' : 'WARNING: Data tampering detected!'}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[200px] border-t md:border-t-0 md:border-l border-surface-container pt-4 md:pt-0 md:pl-6">
                <p className="text-xs font-bold text-outline uppercase mb-1">Authority Actions</p>
                
                <button
                  onClick={() => updateStatus(alert.id, 'Acknowledged')}
                  className="w-full h-10 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">done</span> Acknowledge
                </button>
                
                <button
                  onClick={() => updateStatus(alert.id, 'Dispatching')}
                  className="w-full h-10 bg-[#0051df]/10 hover:bg-[#0051df]/20 text-[#0051df] rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">local_police</span> Dispatch Units
                </button>
                
                <button
                  onClick={() => navigate('/admin/map')}
                  className="w-full h-10 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">my_location</span> View on Map
                </button>

                <div className="h-px bg-surface-container my-1" />

                <button
                  onClick={() => handleVerifyIntegrity(alert)}
                  disabled={verificationResults[alert.id]?.loading}
                  className="w-full h-10 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {verificationResults[alert.id]?.loading ? 'sync' : 'verified'}
                  </span>
                  Verify Blockchain
                </button>

                <button
                  onClick={() => resolveEmergency(alert.id)}
                  className="w-full h-10 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-1 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span> Resolve SOS
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
