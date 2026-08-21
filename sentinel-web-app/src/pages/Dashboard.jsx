/*
 * SentinelMesh — Dashboard (Home) Page
 * Reference: stitch_sentinel_mesh_safety_app/home_updated
 *
 * Shows protection status, SOS button, quick actions grid,
 * and listens to Firebase for real-time device data.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { useDevice } from '../contexts/DeviceContext';
import BottomNav from '../components/BottomNav';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const { deviceConnected, deviceBattery } = useDevice();
  const navigate = useNavigate();
  const [sosActive, setSosActive] = useState(false);
  const [greeting, setGreeting] = useState('Good Morning');

  // Determine greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Listen for active SOS alerts
  useEffect(() => {
    if (!userProfile?.deviceId) return;
    const sosRef = ref(db, `sos_alerts/${userProfile.deviceId}`);
    const unsub = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.active) {
        setSosActive(true);
        navigate('/sos-active');
      }
    });
    return () => unsub();
  }, [userProfile?.deviceId, navigate]);

  // Update user location periodically
  useEffect(() => {
    if (!currentUser) return;
    
    function updateLocation() {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            set(ref(db, `user_locations/${currentUser.uid}`), {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              timestamp: Date.now(),
            });
          },
          (err) => console.warn('Geolocation error:', err),
          { enableHighAccuracy: true }
        );
      }
    }

    updateLocation();
    const interval = setInterval(updateLocation, 60000); // Every minute
    return () => clearInterval(interval);
  }, [currentUser]);

  async function triggerSOS() {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 500]);
    }
    navigate('/sos-active');
  }

  const firstName = userProfile?.name?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'User';

  const quickActions = [
    { icon: 'groups', label: 'Emergency\nContacts', color: 'bg-primary', path: '/emergency-contacts' },
    { icon: 'warning', label: 'Nearby\nEmergencies', color: 'bg-tertiary', path: '/alerts' },
    { icon: 'local_police', label: 'Find\nPolice', color: 'bg-secondary', path: '/find-police' },
    { icon: 'local_hospital', label: 'Find\nHospital', color: 'bg-primary-container', path: '/find-hospital' },
    { icon: 'settings_remote', label: 'Device\nSettings', color: 'bg-surface-variant', textColor: 'text-on-surface-variant', path: '/pair-device' },
    { icon: 'history', label: 'Alert\nHistory', color: 'bg-outline', path: '/notifications' },
  ];

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between px-5 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold">
            {firstName[0]}
          </div>
          <span className="text-xl font-bold text-primary">Sentinel Mesh</span>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="w-10 h-10 flex items-center justify-center text-primary hover:opacity-80 transition-opacity active:scale-95"
        >
          <span className="material-symbols-outlined text-[28px]">notifications</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        {/* Greeting */}
        <section className="mt-6 mb-6">
          <h1 className="text-2xl font-bold text-on-surface leading-tight">
            {greeting}, <br />
            <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-on-surface-variant mt-1 opacity-70">
            Your safety network is active and monitoring.
          </p>
        </section>

        {/* Protection Status Card */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                <span className="text-3xl font-bold text-secondary">SAFE</span>
              </div>
              <p className="text-xs font-medium text-outline uppercase tracking-wider">
                Current Protection Status
              </p>
            </div>
            <div className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] material-symbols-filled">shield</span>
              <span className="text-sm font-semibold">Protected</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">phone_iphone</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Device</span>
                <span className={`text-xs font-bold ${deviceConnected ? 'text-secondary' : 'text-outline'}`}>
                  {deviceConnected ? 'Connected' : (userProfile?.deviceId ? 'Not Connected' : 'Not Paired')}
                </span>
              </div>
            </div>
            <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">battery_horiz_075</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Battery</span>
                <span className="text-xs font-bold text-on-surface-variant">
                  {deviceConnected ? `${deviceBattery}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SOS Button */}
        <section className="flex flex-col items-center justify-center my-6 py-6">
          <div className="relative">
            {/* Decorative rings */}
            <div className="absolute inset-[-24px] rounded-full border border-primary/10 sos-pulse" />
            <div className="absolute inset-[-48px] rounded-full border border-primary/5" />
            <button
              id="sos-trigger"
              className="relative w-56 h-56 rounded-full bg-gradient-to-br from-[#ff0033] to-[#990033] shadow-[0_20px_50px_rgba(255,0,51,0.4)] flex flex-col items-center justify-center text-white transition-all duration-300 group overflow-hidden touch-manipulation active:scale-95"
              onClick={triggerSOS}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 active:opacity-100 transition-opacity" />
              <span className="material-symbols-outlined text-[80px] mb-2 material-symbols-filled">
                emergency
              </span>
              <span className="text-3xl uppercase tracking-widest font-extrabold">
                SOS
              </span>
              <span className="text-sm font-semibold opacity-90 mt-1">Tap to SOS</span>
            </button>
          </div>
          <p className="mt-14 text-on-surface-variant text-center max-w-[280px] mx-auto leading-relaxed">
            Immediately notify emergency contacts and mesh responders.
          </p>
        </section>

        {/* Quick Actions Grid */}
        <section className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <button
              onClick={() => navigate('/profile')}
              className="text-primary text-sm font-semibold"
            >
              Settings
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="glass-card rounded-3xl p-5 flex flex-col items-start gap-4 hover:bg-surface-container transition-colors active:scale-95 text-left"
              >
                <div className={`w-12 h-12 rounded-2xl ${action.color} ${action.textColor || 'text-white'} flex items-center justify-center shadow-md`}>
                  <span className="material-symbols-outlined">{action.icon}</span>
                </div>
                <span className="text-sm font-semibold text-on-surface whitespace-pre-line">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
