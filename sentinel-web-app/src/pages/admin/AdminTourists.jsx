import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeoEngine } from '../../hooks/useGeoEngine';
import { getRiskLevel } from '../../data/demoData';

export default function AdminTourists() {
  const { currentUser } = useAuth();
  const engine = useGeoEngine({ lat: 22.5800, lon: 88.4650 }, { enabled: true, userId: currentUser?.uid });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  const filteredTourists = engine.tourists.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterRisk === 'all') return matchesSearch;
    if (filterRisk === 'high') return matchesSearch && t.riskScore >= 61;
    if (filterRisk === 'safe') return matchesSearch && t.riskScore <= 30;
    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Tourist Management</h2>
          <p className="text-on-surface-variant text-sm">Monitor and track registered tourists in real-time.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant">search</span>
            <input 
              type="text" 
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 pr-4 w-full sm:w-64 bg-white border border-surface-container rounded-xl text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <select 
            value={filterRisk} 
            onChange={(e) => setFilterRisk(e.target.value)}
            className="h-11 px-4 bg-white border border-surface-container rounded-xl text-sm outline-none font-semibold focus:border-primary cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High & Critical Risk</option>
            <option value="safe">Safe Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-container overflow-hidden card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container text-xs font-bold text-outline uppercase tracking-wider">
                <th className="p-4 pl-6">Tourist</th>
                <th className="p-4">Group</th>
                <th className="p-4">Risk Score</th>
                <th className="p-4">Current Zone</th>
                <th className="p-4">Connectivity</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredTourists.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant">
                    No tourists found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTourists.map(t => {
                  const risk = getRiskLevel(t.riskScore);
                  return (
                    <tr key={t.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold" style={{ background: risk.color }}>
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{t.name}</p>
                            <p className="text-xs text-on-surface-variant">{t.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-on-surface">
                        {t.groupId ? <span className="bg-secondary/10 text-secondary px-2 py-1 rounded text-xs">{t.groupId}</span> : <span className="text-outline italic">Solo</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full max-w-[80px] h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.riskScore}%`, background: risk.color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: risk.color }}>{t.riskScore}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-on-surface">
                        {t.currentZone || <span className="text-outline italic">Unzoned</span>}
                        {t.routeStatus !== 'on_route' && (
                          <div className="text-xs text-[#f97316] font-bold flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px]">warning</span> Route Dev
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <span className={`material-symbols-outlined text-[18px] ${t.gpsStatus === 'connected' ? 'text-[#22c55e]' : 'text-error/50'}`} title="GPS">location_on</span>
                          <span className={`material-symbols-outlined text-[18px] ${t.loraStatus === 'connected' ? 'text-[#22c55e]' : 'text-error/50'}`} title="LoRa">wifi_tethering</span>
                          <span className={`material-symbols-outlined text-[18px] ${t.gsmStatus === 'connected' ? 'text-[#22c55e]' : 'text-error/50'}`} title="GSM">cell_tower</span>
                          <span className={`material-symbols-outlined text-[18px] ${t.battery > 20 ? 'text-[#22c55e]' : 'text-error'}`} title="Battery">battery_5_bar</span>
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button className="h-8 px-3 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                          View Profile
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
