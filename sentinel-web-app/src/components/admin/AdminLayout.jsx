import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { ref, onValue } from 'firebase/database';

export default function AdminLayout() {
  const { currentUser, userProfile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [sosAlerts, setSosAlerts] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snap) => {
      const data = snap.val();
      if (!data) { setSosAlerts([]); return; }
      const active = Object.entries(data)
        .filter(([_, a]) => a.active === true)
        .map(([id, a]) => ({ id, ...a }));
      setSosAlerts(active);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <div className="text-center px-8">
          <span className="material-symbols-outlined text-error text-6xl mb-4">admin_panel_settings</span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Admin Access Required</h1>
          <p className="text-on-surface-variant mb-6">
            You need ADMIN privileges to access the Control Center.
          </p>
          <button
            onClick={() => window.history.back()}
            className="h-12 px-6 bg-primary text-white font-semibold rounded-xl shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/admin', icon: 'dashboard', label: 'Overview', exact: true },
    { path: '/admin/alerts', icon: 'emergency', label: 'Emergency Alerts', badge: sosAlerts.length },
    { path: '/admin/map', icon: 'map', label: 'Live Safety Map' },
    { path: '/admin/tourists', icon: 'group', label: 'Tourists' },
    { path: '/admin/geofences', icon: 'hexagon', label: 'Geo-Fences' },
    { path: '/admin/incidents', icon: 'report', label: 'Incidents' },
    { path: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
    { path: '/admin/services', icon: 'local_hospital', label: 'Emergency Services' },
    { path: '/admin/settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex h-dvh bg-surface overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-surface-container z-50 transform transition-transform duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-6 py-5 border-b border-surface-container">
          <span className="material-symbols-outlined text-primary text-3xl material-symbols-filled">
            shield_with_heart
          </span>
          <div>
            <h1 className="text-xl font-bold text-primary leading-tight tracking-tight">Authority</h1>
            <p className="text-[10px] uppercase font-bold text-outline tracking-widest">Control Center</p>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-surface-container flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {userProfile?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface truncate">{userProfile?.name || 'Administrator'}</p>
            <p className="text-xs text-on-surface-variant truncate">ID: AUTH-{currentUser?.uid?.substring(0, 5).toUpperCase()}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </div>
              {item.badge > 0 && (
                <span className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-surface-container">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-surface-container z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-on-surface-variant">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-primary">Authority Center</span>
          <div className="w-6" /> {/* Placeholder */}
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f8fafc] relative z-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
