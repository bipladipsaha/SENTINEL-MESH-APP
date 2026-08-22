/*
 * SentinelMesh — Notifications Page
 * Reference: stitch_sentinel_mesh_safety_app/notifications
 *
 * Shows a feed of SOS alerts, device events, and system notifications.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import BottomNav from '../components/BottomNav';

const notificationTypes = {
  SOS_ALERT: { icon: 'emergency', color: 'text-error', bg: 'bg-error/10', borderColor: 'border-l-error', label: 'NEARBY EMERGENCY' },
  SOS_ACTIVATED: { icon: 'wifi_tethering', color: 'text-[#E65100]', bg: 'bg-orange-100', borderColor: 'border-l-orange-500', label: 'SOS ACTIVATED' },
  LOW_BATTERY: { icon: 'battery_low', color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-l-amber-500', label: 'LOW BATTERY' },
  DEVICE_CONNECTED: { icon: 'devices', color: 'text-secondary', bg: 'bg-secondary/10', borderColor: 'border-l-secondary', label: 'DEVICE CONNECTED' },
  SOS_RESOLVED: { icon: 'check_circle', color: 'text-secondary', bg: 'bg-secondary/10', borderColor: 'border-l-secondary', label: 'RESOLVED' },
};

export default function Notifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen to SOS alerts as notifications
    const sosRef = ref(db, 'sos_alerts');
    const unsub = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setNotifications(getDemoNotifications());
        return;
      }

      const notifs = Object.entries(data).map(([key, alert]) => ({
        id: key,
        type: alert.active ? 'SOS_ALERT' : 'SOS_RESOLVED',
        title: alert.active ? 'Medical assistance requested' : 'Emergency resolved',
        body: alert.active
          ? `A distress signal was detected from device ${alert.deviceId}.`
          : `The SOS alert from device ${alert.deviceId} has been resolved.`,
        timestamp: alert.timestamp || Date.now(),
        lat: alert.lat,
        lon: alert.lon,
      }));

      setNotifications([...notifs, ...getDemoNotifications()].sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => unsub();
  }, []);

  function getDemoNotifications() {
    const now = Date.now();
    return [
      {
        id: 'demo-1',
        type: 'SOS_ACTIVATED',
        title: 'Emergency contacts notified',
        body: 'Your SOS sequence was completed. Contact "Home Base" has acknowledged the alert.',
        timestamp: now - 15 * 60000,
      },
      {
        id: 'demo-2',
        type: 'LOW_BATTERY',
        title: 'Sentinel Hub at 15%',
        body: 'Please connect your primary mesh device to a power source to ensure uninterrupted protection.',
        timestamp: now - 60 * 60000,
      },
      {
        id: 'demo-3',
        type: 'DEVICE_CONNECTED',
        title: 'New Node Connected',
        body: 'Device successfully paired with the mesh network. Signal strength: Excellent.',
        timestamp: now - 3 * 3600000,
      },
    ];
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-40 w-full flex items-center justify-between px-5 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {currentUser?.displayName?.[0] || 'U'}
          </div>
          <span className="text-xl font-bold text-primary">TravelRakshak</span>
        </div>
        <span className="material-symbols-outlined text-primary text-[28px]">notifications</span>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        <h1 className="text-2xl font-bold text-on-surface mt-4 mb-2">Notifications</h1>
        <p className="text-on-surface-variant mb-6">
          Stay updated on your safety network and device status.
        </p>

        <div className="flex flex-col gap-4">
          {notifications.map((notif) => {
            const config = notificationTypes[notif.type] || notificationTypes.DEVICE_CONNECTED;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl p-5 card-shadow border-l-4 ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined ${config.color} material-symbols-filled`}>
                      {config.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold ${config.color} uppercase tracking-wider`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-outline ml-2 flex-shrink-0">
                        {timeAgo(notif.timestamp)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-on-surface mb-1">{notif.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{notif.body}</p>

                    {notif.type === 'SOS_ALERT' && notif.lat && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => navigate('/alerts')}
                          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg btn-press transition-all"
                        >
                          View Map
                        </button>
                        <button className="px-4 py-2 bg-surface-container text-on-surface text-sm font-semibold rounded-lg btn-press transition-all">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* End of Feed */}
        <div className="mt-8 mb-4 text-center py-8 border-2 border-dashed border-surface-container rounded-3xl">
          <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">
            notifications_active
          </span>
          <h3 className="text-lg font-semibold text-on-surface mb-1">End of Feed</h3>
          <p className="text-sm text-on-surface-variant">
            You're caught up with all recent alerts and status updates.
          </p>
        </div>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}
