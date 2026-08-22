/*
 * SentinelMesh — Geo-Fence Management Page
 *
 * Admin interface to create, edit, disable, and delete geo-fences.
 * Supports polygon drawing on the map.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ZONE_COLORS, DEMO_GEOFENCES } from '../data/demoData';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DrawingLayer({ points, setPoints, drawing }) {
  useMapEvents({
    click(e) {
      if (drawing) {
        setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
}

export default function ManageGeoFences() {
  const navigate = useNavigate();
  const [fences, setFences] = useState([...DEMO_GEOFENCES]);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editFence, setEditFence] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('safe');
  const [formRisk, setFormRisk] = useState(10);
  const [formActiveFrom, setFormActiveFrom] = useState('00:00');
  const [formActiveUntil, setFormActiveUntil] = useState('23:59');
  const [formDescription, setFormDescription] = useState('');

  // Load from Firebase
  useEffect(() => {
    const gfRef = ref(db, 'geo_fences');
    const unsub = onValue(gfRef, (snap) => {
      const data = snap.val();
      if (data) {
        const fbFences = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        setFences([...DEMO_GEOFENCES, ...fbFences]);
      } else {
        setFences([...DEMO_GEOFENCES]);
      }
    });
    return () => unsub();
  }, []);

  function startDrawing() {
    setDrawing(true);
    setDrawPoints([]);
    setShowForm(false);
    setEditFence(null);
  }

  function finishDrawing() {
    if (drawPoints.length < 3) {
      alert('Please click at least 3 points on the map to create a polygon.');
      return;
    }
    setDrawing(false);
    setShowForm(true);
    resetForm();
  }

  function cancelDrawing() {
    setDrawing(false);
    setDrawPoints([]);
    setShowForm(false);
    setEditFence(null);
  }

  function resetForm() {
    setFormName('');
    setFormType('safe');
    setFormRisk(10);
    setFormActiveFrom('00:00');
    setFormActiveUntil('23:59');
    setFormDescription('');
  }

  async function saveFence() {
    if (!formName.trim()) return;

    const fenceData = {
      name: formName.trim(),
      type: formType,
      riskLevel: parseInt(formRisk),
      coordinates: drawPoints,
      activeFrom: formActiveFrom,
      activeUntil: formActiveUntil,
      description: formDescription.trim(),
      status: 'active',
      actions: formType === 'restricted'
        ? ['warning', 'wearable_alert', 'authority_notification', 'log']
        : formType === 'caution'
        ? ['warning', 'log']
        : ['log'],
      createdAt: Date.now(),
    };

    try {
      if (editFence && !editFence.id.startsWith('gf-')) {
        // Update existing Firebase fence
        await update(ref(db, `geo_fences/${editFence.id}`), fenceData);
      } else {
        // Create new
        await push(ref(db, 'geo_fences'), fenceData);
      }
    } catch (e) {
      console.error('Save fence error:', e);
    }

    setShowForm(false);
    setDrawPoints([]);
    setEditFence(null);
  }

  async function deleteFence(fence) {
    if (fence.id.startsWith('gf-')) {
      alert('Demo fences cannot be deleted.');
      return;
    }
    try {
      await remove(ref(db, `geo_fences/${fence.id}`));
    } catch (e) {
      console.error('Delete error:', e);
    }
  }

  async function toggleFence(fence) {
    if (fence.id.startsWith('gf-')) return;
    try {
      await update(ref(db, `geo_fences/${fence.id}`), {
        status: fence.status === 'active' ? 'disabled' : 'active',
      });
    } catch (e) {
      console.error('Toggle error:', e);
    }
  }

  const center = [22.5800, 88.4650];

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-surface-container z-[400]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">Manage Geo-Fences</span>
        </div>
        <div className="flex gap-2">
          {drawing ? (
            <>
              <button
                onClick={cancelDrawing}
                className="h-9 px-3 bg-surface-container-low rounded-lg text-xs font-bold text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={finishDrawing}
                className="h-9 px-3 bg-primary text-white rounded-lg text-xs font-bold"
              >
                Done ({drawPoints.length} pts)
              </button>
            </>
          ) : (
            <button
              onClick={startDrawing}
              className="h-9 px-3 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create Fence
            </button>
          )}
        </div>
      </header>

      {/* Drawing hint */}
      {drawing && (
        <div className="bg-secondary/10 px-4 py-2 text-center">
          <p className="text-sm font-semibold text-secondary">
            🖱️ Click on the map to place polygon points ({drawPoints.length} placed)
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Map (left side on desktop, full on mobile) */}
        <div className="flex-1 relative">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <DrawingLayer points={drawPoints} setPoints={setDrawPoints} drawing={drawing} />

            {/* Existing fences */}
            {fences.map((gf) => {
              if (!gf.coordinates || gf.coordinates.length < 3) return null;
              const colors = ZONE_COLORS[gf.type] || ZONE_COLORS.safe;
              return (
                <Polygon
                  key={gf.id}
                  positions={gf.coordinates}
                  pathOptions={{
                    color: gf.status === 'disabled' ? '#adb5bd' : colors.stroke,
                    fillColor: gf.status === 'disabled' ? '#adb5bd' : colors.fill,
                    fillOpacity: gf.status === 'disabled' ? 0.05 : colors.fillOpacity,
                    weight: 2,
                    dashArray: gf.status === 'disabled' ? '5,5' : undefined,
                  }}
                >
                  <Popup>
                    <strong>{gf.name}</strong><br />
                    Type: {gf.type.toUpperCase()}<br />
                    Status: {gf.status}
                  </Popup>
                </Polygon>
              );
            })}

            {/* Drawing preview */}
            {drawPoints.length > 0 && (
              <>
                <Polygon
                  positions={drawPoints}
                  pathOptions={{ color: '#8a2be2', fillColor: '#8a2be2', fillOpacity: 0.2, weight: 2, dashArray: '5,5' }}
                />
                {drawPoints.map((p, i) => (
                  <Marker
                    key={i}
                    position={p}
                    icon={new L.DivIcon({
                      className: 'draw-point',
                      html: `<div style="width:16px;height:16px;background:#8a2be2;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8],
                    })}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>

        {/* Sidebar — Create/Edit Form OR Fence List */}
        <div className="w-80 bg-white border-l border-surface-container overflow-y-auto hidden md:block">
          {showForm ? (
            <div className="p-4">
              <h3 className="font-bold text-on-surface mb-4">New Geo-Fence</h3>

              <label className="block mb-3">
                <span className="text-xs font-bold text-outline uppercase">Name</span>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 px-3 mt-1 border border-surface-container rounded-lg text-sm outline-none input-focus"
                  placeholder="e.g., Tiger Reserve Zone"
                />
              </label>

              <label className="block mb-3">
                <span className="text-xs font-bold text-outline uppercase">Type</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full h-10 px-3 mt-1 border border-surface-container rounded-lg text-sm outline-none"
                >
                  <option value="safe">🟢 Safe Zone</option>
                  <option value="caution">🟡 Caution Zone</option>
                  <option value="restricted">🔴 Restricted Zone</option>
                </select>
              </label>

              <label className="block mb-3">
                <span className="text-xs font-bold text-outline uppercase">Risk Level (0-100)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formRisk}
                  onChange={(e) => setFormRisk(e.target.value)}
                  className="w-full h-10 px-3 mt-1 border border-surface-container rounded-lg text-sm outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="block">
                  <span className="text-xs font-bold text-outline uppercase">Active From</span>
                  <input
                    type="time"
                    value={formActiveFrom}
                    onChange={(e) => setFormActiveFrom(e.target.value)}
                    className="w-full h-10 px-3 mt-1 border border-surface-container rounded-lg text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-outline uppercase">Active Until</span>
                  <input
                    type="time"
                    value={formActiveUntil}
                    onChange={(e) => setFormActiveUntil(e.target.value)}
                    className="w-full h-10 px-3 mt-1 border border-surface-container rounded-lg text-sm outline-none"
                  />
                </label>
              </div>

              <label className="block mb-4">
                <span className="text-xs font-bold text-outline uppercase">Description</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full h-20 px-3 py-2 mt-1 border border-surface-container rounded-lg text-sm outline-none resize-none"
                  placeholder="Description of this zone..."
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={cancelDrawing}
                  className="flex-1 h-10 bg-surface-container-low rounded-lg text-sm font-bold text-on-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFence}
                  className="flex-1 h-10 bg-primary text-white rounded-lg text-sm font-bold"
                >
                  Save Fence
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-bold text-on-surface mb-4">All Geo-Fences ({fences.length})</h3>
              <div className="flex flex-col gap-2">
                {fences.map((gf) => {
                  const colors = ZONE_COLORS[gf.type] || ZONE_COLORS.safe;
                  return (
                    <div
                      key={gf.id}
                      className={`rounded-xl p-3 border ${
                        gf.status === 'disabled' ? 'opacity-50 border-surface-container' : 'border-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: colors.fill }}
                        />
                        <span className="text-sm font-bold text-on-surface">{gf.name}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mb-2">
                        {gf.type.toUpperCase()} • Risk: {gf.riskLevel} • {gf.activeFrom}-{gf.activeUntil}
                      </p>
                      {!gf.id.startsWith('gf-') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleFence(gf)}
                            className="text-xs text-primary font-semibold"
                          >
                            {gf.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deleteFence(gf)}
                            className="text-xs text-error font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {gf.id.startsWith('gf-') && (
                        <span className="text-[10px] text-outline">Demo data (read-only)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
