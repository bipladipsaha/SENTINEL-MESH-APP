/*
 * SentinelMesh — Demo Controller
 *
 * Floating, expandable panel for simulating tourist movement,
 * geo-fence events, route deviation, SOS, and hardware status
 * without physical ESP32 hardware.
 */

import { useState, useRef, useEffect } from 'react';
import { DEMO_TOURISTS, DEMO_GEOFENCES } from '../data/demoData';

export default function DemoController({ onLocationUpdate, onStatusChange, userLocation }) {
  const [expanded, setExpanded] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const intervalRef = useRef(null);

  // Predefined simulation path: hotel → safe zone → caution → restricted → back
  const SIM_PATH = [
    { lat: 22.5770, lon: 88.4680, label: 'Start (Hotel)' },
    { lat: 22.5790, lon: 88.4700, label: 'Walking to attraction' },
    { lat: 22.5810, lon: 88.4710, label: 'Safe Zone (Business Hub)' },
    { lat: 22.5830, lon: 88.4650, label: 'Approaching Caution Zone' },
    { lat: 22.5840, lon: 88.4480, label: 'Entering Caution Zone' },
    { lat: 22.5835, lon: 88.4460, label: 'Inside Caution Zone' },
    { lat: 22.5850, lon: 88.4500, label: 'Leaving Route' },
    { lat: 22.5870, lon: 88.4550, label: 'Near Restricted Zone' },
    { lat: 22.5885, lon: 88.4575, label: 'Entering Restricted Zone!' },
    { lat: 22.5890, lon: 88.4580, label: 'Inside Restricted Zone!' },
    { lat: 22.5870, lon: 88.4560, label: 'Leaving Restricted' },
    { lat: 22.5820, lon: 88.4700, label: 'Back to safe area' },
    { lat: 22.5770, lon: 88.4680, label: 'Returned to Hotel' },
  ];

  function startSimulation() {
    setSimRunning(true);
    setSimStep(0);
    onLocationUpdate(SIM_PATH[0]);
  }

  function stopSimulation() {
    setSimRunning(false);
    clearInterval(intervalRef.current);
  }

  useEffect(() => {
    if (!simRunning) return;

    intervalRef.current = setInterval(() => {
      setSimStep((prev) => {
        const next = prev + 1;
        if (next >= SIM_PATH.length) {
          setSimRunning(false);
          return prev;
        }
        onLocationUpdate(SIM_PATH[next]);
        return next;
      });
    }, 3000); // Move every 3 seconds

    return () => clearInterval(intervalRef.current);
  }, [simRunning]);

  function jumpToZone(type) {
    const fence = DEMO_GEOFENCES.find((g) => g.type === type);
    if (fence) {
      // Jump to center of the polygon
      const centerLat = fence.coordinates.reduce((s, c) => s + c[0], 0) / fence.coordinates.length;
      const centerLon = fence.coordinates.reduce((s, c) => s + c[1], 0) / fence.coordinates.length;
      onLocationUpdate({ lat: centerLat, lon: centerLon });
    }
  }

  function simulateSOS() {
    if (onStatusChange) onStatusChange({ sos: true });
  }

  function simulateDisconnect(type) {
    if (onStatusChange) onStatusChange({ [type]: 'disconnected' });
  }

  function simulateLowBattery() {
    if (onStatusChange) onStatusChange({ battery: 12 });
  }

  function resetSimulation() {
    stopSimulation();
    setSimStep(0);
    onLocationUpdate({ lat: 22.5770, lon: 88.4680 });
    if (onStatusChange) {
      onStatusChange({
        battery: 85,
        gpsStatus: 'connected',
        loraStatus: 'connected',
        gsmStatus: 'connected',
        sos: false,
      });
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-24 right-4 z-[999] w-14 h-14 rounded-full bg-secondary text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform"
        title="Demo Controls"
      >
        <span className="material-symbols-outlined text-[28px]">science</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-[999] w-80 bg-white rounded-2xl shadow-2xl border border-surface-container overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-secondary text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined">science</span>
          <span className="font-bold text-sm">Demo Simulator</span>
        </div>
        <button onClick={() => setExpanded(false)} className="active:scale-90 transition-transform">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
        {/* Simulation Status */}
        {simRunning && (
          <div className="bg-secondary/10 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Simulating</p>
            <p className="text-sm font-semibold text-on-surface">{SIM_PATH[simStep]?.label}</p>
            <div className="w-full bg-surface-container rounded-full h-1.5 mt-2">
              <div
                className="bg-secondary h-1.5 rounded-full transition-all"
                style={{ width: `${((simStep + 1) / SIM_PATH.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Movement Controls */}
        <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Movement</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={simRunning ? stopSimulation : startSimulation}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
              simRunning
                ? 'bg-error/10 text-error'
                : 'bg-secondary/10 text-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{simRunning ? 'stop' : 'play_arrow'}</span>
            {simRunning ? 'Stop' : 'Start Path'}
          </button>
          <button
            onClick={resetSimulation}
            className="h-10 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Reset
          </button>
        </div>

        {/* Zone Jump */}
        <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Jump to Zone</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => jumpToZone('safe')}
            className="h-9 bg-[#22c55e]/10 text-[#16a34a] rounded-lg text-xs font-bold"
          >
            🟢 Safe
          </button>
          <button
            onClick={() => jumpToZone('caution')}
            className="h-9 bg-[#eab308]/10 text-[#ca8a04] rounded-lg text-xs font-bold"
          >
            🟡 Caution
          </button>
          <button
            onClick={() => jumpToZone('restricted')}
            className="h-9 bg-[#ef4444]/10 text-[#dc2626] rounded-lg text-xs font-bold"
          >
            🔴 Restrict
          </button>
        </div>

        {/* Status Simulation */}
        <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Simulate Events</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={simulateSOS}
            className="h-10 bg-error/10 text-error rounded-xl text-xs font-bold flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">sos</span>
            Trigger SOS
          </button>
          <button
            onClick={simulateLowBattery}
            className="h-10 bg-[#f97316]/10 text-[#ea580c] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">battery_low</span>
            Low Battery
          </button>
          <button
            onClick={() => simulateDisconnect('loraStatus')}
            className="h-10 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface-variant flex items-center justify-center gap-1"
          >
            LoRa Offline
          </button>
          <button
            onClick={() => simulateDisconnect('gsmStatus')}
            className="h-10 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface-variant flex items-center justify-center gap-1"
          >
            GSM Offline
          </button>
        </div>
      </div>
    </div>
  );
}
