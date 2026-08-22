import React from 'react';

export default function AdminSettings() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-on-surface mb-6">System Settings</h2>
      
      <div className="max-w-3xl flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-6 card-shadow border border-surface-container">
          <h3 className="font-bold text-lg text-on-surface mb-4">Notification Preferences</h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-bold text-on-surface text-sm">Critical SOS Alerts</p>
                <p className="text-xs text-on-surface-variant">Push notifications and loud alarm</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
            </label>
            <div className="h-px bg-surface-container" />
            <label className="flex items-center justify-between">
              <div>
                <p className="font-bold text-on-surface text-sm">Geo-Fence Violations</p>
                <p className="text-xs text-on-surface-variant">Silent push notifications</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
            </label>
            <div className="h-px bg-surface-container" />
            <label className="flex items-center justify-between">
              <div>
                <p className="font-bold text-on-surface text-sm">Offline Tourists</p>
                <p className="text-xs text-on-surface-variant">Alert when tracker loses signal for &gt;10 mins</p>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-primary" />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 card-shadow border border-surface-container">
          <h3 className="font-bold text-lg text-on-surface mb-4">Blockchain Audit Log</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            TravelRakshak logs all major authority actions (SOS resolution, dispatch) to the blockchain for immutable public auditing.
          </p>
          <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#22c55e]">verified_user</span>
              <span className="text-sm font-bold text-on-surface">Blockchain Audit Active</span>
            </div>
            <span className="text-xs font-mono text-outline">Network: Polygon Amoy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
