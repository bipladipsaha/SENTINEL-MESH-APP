/*
 * SentinelMesh — SOS Active / Countdown Page
 * Reference: stitch_sentinel_mesh_safety_app/sos_countdown
 *
 * Shows a 15-second countdown with cancel option.
 * If not cancelled, triggers SOS to Firebase and nearby responders.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, set, onValue } from 'firebase/database';

export default function SOSActive() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState(null);
  const intervalRef = useRef(null);

  // Get current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Listen for remote resolution (e.g., from hardware)
  useEffect(() => {
    if (!currentUser) return;
    const deviceId = userProfile?.deviceId || `web-${currentUser.uid.slice(0, 8)}`;
    const sosRef = ref(db, `sos_alerts/${deviceId}/active`);
    
    const unsub = onValue(sosRef, (snapshot) => {
      const isActive = snapshot.val();
      if (isActive === false) {
        clearInterval(intervalRef.current);
        navigate('/');
      }
    });

    return () => unsub();
  }, [currentUser, userProfile, navigate]);

  // Countdown timer
  useEffect(() => {
    if (sent) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          sendSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [sent]);

  async function sendSOS() {
    setSent(true);
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 1000]);
    }

    const deviceId = userProfile?.deviceId || `web-${currentUser.uid.slice(0, 8)}`;
    const sosData = {
      deviceId,
      lat: location?.lat || 0,
      lon: location?.lon || 0,
      type: 'MANUAL_SOS',
      battery: 100,
      active: true,
      timestamp: Date.now(),
      userId: currentUser.uid,
      userName: userProfile?.name || currentUser.displayName || 'Unknown',
    };

    try {
      await set(ref(db, `sos_alerts/${deviceId}`), sosData);
      // Also update user location
      await set(ref(db, `user_locations/${currentUser.uid}`), {
        lat: location?.lat || 0,
        lon: location?.lon || 0,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('SOS send error:', err);
    }
  }

  function cancelSOS() {
    clearInterval(intervalRef.current);
    navigate('/');
  }

  async function resolveEmergency() {
    const deviceId = userProfile?.deviceId || `web-${currentUser.uid.slice(0, 8)}`;
    try {
      await set(ref(db, `sos_alerts/${deviceId}/active`), false);
    } catch (err) {
      console.error('Resolve error:', err);
    }
    navigate('/');
  }

  // Calculate ring progress
  const circumference = 2 * Math.PI * 130;
  const progress = (countdown / 15) * circumference;

  return (
    <div className="min-h-dvh bg-surface flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">shield</span>
          <span className="text-xl font-bold text-primary">Sentinel Mesh</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 max-w-md mx-auto w-full">
        {!sent ? (
          <>
            {/* Alert Badge */}
            <div className="bg-error-container px-5 py-2.5 rounded-full flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-error text-lg material-symbols-filled">emergency</span>
              <span className="text-xs font-bold text-error uppercase tracking-wider">
                Potential Emergency Detected
              </span>
            </div>

            <h1 className="text-2xl font-bold text-on-surface text-center mb-2">
              Emergency detected.<br />Sending in...
            </h1>
            <p className="text-on-surface-variant text-center mb-8 max-w-xs">
              Your coordinates and medical profile will be shared with the mesh response network.
            </p>

            {/* Countdown Ring */}
            <div className="relative w-64 h-64 mb-8">
              <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90">
                <circle cx="140" cy="140" r="130" fill="none" stroke="#e7eeff" strokeWidth="10" />
                <circle
                  cx="140" cy="140" r="130"
                  fill="none"
                  stroke="#ba1a1a"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  className="transition-all duration-1000 linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-extrabold text-error">{countdown}</span>
              </div>
            </div>

            {/* Location Info */}
            {location && (
              <div className="bg-white rounded-2xl p-4 w-full card-shadow flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Current Location</p>
                  <p className="text-sm text-on-surface-variant">
                    {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                  </p>
                  <p className="text-xs text-outline">
                    Accuracy: {location.accuracy < 10 ? 'High' : 'Medium'} (within {Math.round(location.accuracy)}m)
                  </p>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={cancelSOS}
              className="w-full h-14 bg-surface-container-high text-on-surface font-semibold rounded-xl transition-all btn-press flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">close</span>
              Cancel
            </button>
            <p className="text-xs text-on-surface-variant mt-3 text-center">
              If you do not cancel, help will be dispatched automatically.
            </p>
          </>
        ) : (
          <>
            {/* SOS Sent State */}
            <div className="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mb-6 sos-pulse-danger">
              <span className="material-symbols-outlined text-error text-5xl material-symbols-filled">
                sos
              </span>
            </div>
            <h1 className="text-2xl font-bold text-error text-center mb-2">SOS Alert Sent!</h1>
            <p className="text-on-surface-variant text-center mb-8 max-w-xs">
              Emergency contacts and nearby responders have been notified. Help is on the way.
            </p>

            <div className="bg-error-container/30 rounded-2xl p-4 w-full mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-error text-lg">broadcast_on_personal</span>
                <span className="text-sm font-bold text-error">BROADCASTING</span>
              </div>
              <p className="text-sm text-on-surface-variant">
                Your location is being shared with the mesh network. Stay where you are if it is safe to do so.
              </p>
            </div>

            <button
              onClick={resolveEmergency}
              className="w-full h-14 bg-secondary text-white font-semibold rounded-xl shadow-md btn-press transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              I'm Safe — Resolve Emergency
            </button>
          </>
        )}
      </main>
    </div>
  );
}
