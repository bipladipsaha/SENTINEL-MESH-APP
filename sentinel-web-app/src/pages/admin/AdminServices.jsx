import React from 'react';

export default function AdminServices() {
  const services = [
    { name: 'Central Police Headquarters', type: 'Police', phone: '100', address: 'Bidhannagar Commissionerate' },
    { name: 'City General Hospital', type: 'Hospital', phone: '102', address: 'New Town Action Area 1' },
    { name: 'Fire Station Sector V', type: 'Fire', phone: '101', address: 'Sector V, Salt Lake' },
    { name: 'Disaster Management Unit', type: 'Disaster Relief', phone: '1070', address: 'Kolkata District HQ' },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-on-surface mb-6">Emergency Services Directory</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl card-shadow border border-surface-container">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#0051df]/10 text-[#0051df] flex items-center justify-center">
                <span className="material-symbols-outlined">
                  {service.type === 'Police' ? 'local_police' : service.type === 'Hospital' ? 'local_hospital' : service.type === 'Fire' ? 'fire_truck' : 'support_agent'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">{service.name}</h3>
                <p className="text-xs font-bold uppercase text-outline">{service.type}</p>
              </div>
            </div>
            <div className="space-y-2 mt-4 text-sm">
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">call</span>
                <span className="font-bold">{service.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">location_on</span>
                <span>{service.address}</span>
              </div>
            </div>
            <button className="w-full mt-4 h-10 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-on-surface transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">phone_forwarded</span> Dispatch Line
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
