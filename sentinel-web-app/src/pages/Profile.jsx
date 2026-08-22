/*
 * SentinelMesh — Profile Page
 * Reference: stitch_sentinel_mesh_safety_app/profile
 *
 * Shows user identity, device info, emergency contacts, and logout.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);

  // Load emergency contacts
  useEffect(() => {
    if (!currentUser) return;
    const contactsRef = ref(db, `emergency_contacts/${currentUser.uid}`);
    const unsub = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setContacts(Object.values(data));
      }
    });
    return () => unsub();
  }, [currentUser]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  const name = userProfile?.name || currentUser?.displayName || 'User';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-40 w-full flex items-center justify-between px-5 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {initials}
          </div>
          <span className="text-xl font-bold text-primary">TravelRakshak</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[28px]">notifications</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        {/* Profile Card */}
        <section className="flex flex-col items-center mt-6 mb-6">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {initials}
            </div>
            <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{name}</h1>
          <p className="text-on-surface-variant font-medium">
            {userProfile?.role === 'admin' ? '🛡️ Authority' : '🧳 Tourist'} • Active
          </p>
        </section>

        {/* Admin Access */}
        {userProfile?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full h-14 bg-secondary text-white font-semibold rounded-xl shadow-md btn-press transition-all mb-4 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            Open Authority Control Center
          </button>
        )}

        {/* Security Identity */}
        <div className="bg-white rounded-3xl p-5 card-shadow mb-4 border border-surface-container">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary material-symbols-filled">fingerprint</span>
            <span className="font-semibold text-primary">Security Identity</span>
          </div>
          <div className="mb-3">
            <p className="text-xs text-outline uppercase tracking-wider">Device ID</p>
            <p className="text-lg font-bold text-on-surface">{userProfile?.deviceId || 'Not Paired'}</p>
          </div>
          <div className="mb-3">
            <p className="text-xs text-outline uppercase tracking-wider">Phone</p>
            <p className="text-lg font-bold text-on-surface">{userProfile?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-outline uppercase tracking-wider">Email</p>
            <p className="text-sm text-on-surface-variant">{currentUser?.email || '—'}</p>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-3xl p-5 card-shadow mb-4 border border-surface-container">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Emergency Contacts</h2>
            <button
              onClick={() => navigate('/emergency-contacts')}
              className="text-primary text-sm font-semibold"
            >
              Manage All
            </button>
          </div>

          {contacts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {contacts.slice(0, 3).map((contact, i) => (
                <button
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {contact.name?.[0] || '?'}{contact.name?.split(' ')[1]?.[0] || ''}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-on-surface">{contact.name}</p>
                    <p className="text-xs text-on-surface-variant">{contact.relation} • {contact.alertLevel || 'Immediate Responder'}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline">chevron_right</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">No emergency contacts added yet.</p>
          )}

          <button
            onClick={() => navigate('/emergency-contacts')}
            className="w-full mt-3 py-3 border-2 border-dashed border-surface-container rounded-xl text-sm font-semibold text-on-surface-variant hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle_outline</span>
            Add Emergency Contact
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={() => navigate('/pair-device')}
          className="w-full h-14 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all mb-3 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          Edit Profile
        </button>

        <button
          onClick={handleLogout}
          className="w-full h-14 bg-error-container text-error font-semibold rounded-xl transition-all btn-press mb-6 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout from Device
        </button>

        {/* Footer */}
        <div className="text-center py-4 border-t border-surface-container">
          <p className="text-xs text-outline">
            Protected by TravelRakshak Encryption v4.2.0
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="text-xs text-primary hover:underline">Privacy Policy</a>
            <a href="#" className="text-xs text-primary hover:underline">Help Center</a>
          </div>
        </div>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}
