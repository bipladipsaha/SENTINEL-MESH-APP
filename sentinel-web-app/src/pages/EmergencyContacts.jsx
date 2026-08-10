/*
 * SentinelMesh — Emergency Contacts Management
 *
 * Add, edit, and remove emergency contacts.
 * Contacts are stored in Firebase RTDB under /emergency_contacts/{userId}.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, push, remove, set } from 'firebase/database';
import BottomNav from '../components/BottomNav';

export default function EmergencyContacts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', relation: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const contactsRef = ref(db, `emergency_contacts/${currentUser.uid}`);
    const unsub = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setContacts(
          Object.entries(data).map(([key, val]) => ({ id: key, ...val }))
        );
      } else {
        setContacts([]);
      }
    });
    return () => unsub();
  }, [currentUser]);

  async function addContact() {
    if (!formData.name || !formData.phone) return;
    setSaving(true);
    try {
      const contactsRef = ref(db, `emergency_contacts/${currentUser.uid}`);
      await push(contactsRef, {
        name: formData.name,
        phone: formData.phone,
        relation: formData.relation || 'Emergency Contact',
        alertLevel: 'Immediate Responder',
        addedAt: Date.now(),
      });
      setFormData({ name: '', phone: '', relation: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Add contact error:', err);
    }
    setSaving(false);
  }

  async function removeContact(contactId) {
    try {
      await remove(ref(db, `emergency_contacts/${currentUser.uid}/${contactId}`));
    } catch (err) {
      console.error('Remove contact error:', err);
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-40 w-full flex items-center gap-3 px-5 py-4 bg-surface/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="text-on-surface-variant">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="text-xl font-bold text-primary">Emergency Contacts</span>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        <p className="text-on-surface-variant mb-6">
          These contacts will be notified immediately when an SOS is triggered.
        </p>

        {/* Contact List */}
        <div className="flex flex-col gap-3 mb-6">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl p-4 card-shadow flex items-center gap-3 border border-surface-container"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {contact.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-on-surface">{contact.name}</p>
                <p className="text-sm text-on-surface-variant">{contact.relation}</p>
                <p className="text-xs text-outline">{contact.phone}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`tel:${contact.phone}`)}
                  className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </button>
                <button
                  onClick={() => removeContact(contact.id)}
                  className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          ))}

          {contacts.length === 0 && !showForm && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-outline/30 text-5xl mb-3">group_add</span>
              <p className="text-on-surface-variant">No emergency contacts yet. Add your first one below.</p>
            </div>
          )}
        </div>

        {/* Add Contact Form */}
        {showForm ? (
          <div className="bg-white rounded-3xl p-5 card-shadow mb-4 border border-primary/20 animate-fade-in">
            <h3 className="font-semibold text-on-surface mb-4">Add New Contact</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-sm outline-none input-focus"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-12 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-sm outline-none input-focus"
              />
              <input
                type="text"
                placeholder="Relationship (e.g., Father, Doctor)"
                value={formData.relation}
                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                className="w-full h-12 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-sm outline-none input-focus"
              />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-12 bg-surface-container text-on-surface font-semibold rounded-xl btn-press transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addContact}
                  disabled={saving || !formData.name || !formData.phone}
                  className="flex-1 h-12 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full h-14 border-2 border-dashed border-primary/30 rounded-xl text-primary font-semibold transition-all hover:bg-primary/5 flex items-center justify-center gap-2 btn-press"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle_outline</span>
            Add Emergency Contact
          </button>
        )}

        {/* Info */}
        <div className="bg-primary-fixed/30 rounded-2xl p-4 flex items-start gap-3 mt-6">
          <span className="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Emergency contacts will receive SMS alerts via Twilio when an SOS is triggered. Make sure phone numbers include the country code (e.g., +91).
          </p>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
