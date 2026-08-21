/*
 * SentinelMesh — Bottom Navigation Bar
 * Persistent bottom nav with Home, Alerts, Mesh, Profile tabs.
 */

import { useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'home', icon: 'home', label: 'Home', path: '/' },
  { id: 'map', icon: 'map', label: 'Map', path: '/map' },
  { id: 'mesh', icon: 'phone_iphone', label: 'Mesh', path: '/pair-device' },
  { id: 'profile', icon: 'person', label: 'Profile', path: '/profile' },
];

export default function BottomNav({ active = 'home' }) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-[1000] flex justify-around items-center px-4 py-3 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.04)] bg-white/90 backdrop-blur-md">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center rounded-xl px-4 py-2 active:scale-90 transition-all duration-200 ${
              isActive
                ? 'bg-primary-container text-white'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? 'material-symbols-filled' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-xs font-medium mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
