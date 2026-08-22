/*
 * SentinelMesh — Device Pairing Page
 * Reference: stitch_sentinel_mesh_safety_app/register_wearable
 *
 * Uses Web Bluetooth API to scan for ESP32 BLE service.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { db } from '../firebase';
import { ref, update } from 'firebase/database';

export default function PairDevice() {
  const { currentUser } = useAuth();
  const { scanAndConnect } = useDevice();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, scanning, connected, error
  const [deviceName, setDeviceName] = useState('');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pairMethod, setPairMethod] = useState(null); // 'bluetooth' | 'manual'

  async function scanBluetooth() {
    setStatus('scanning');
    setErrorMsg('');

    try {
      const deviceIdStr = await scanAndConnect();
      setDeviceName(deviceIdStr);
      setStatus('connected');
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setErrorMsg('No TravelRakshak device found nearby. Make sure your device is on.');
      } else {
        setErrorMsg(`Connection failed: ${err.message}`);
      }
      setStatus('error');
    }
  }

  async function pairManually() {
    if (!deviceIdInput.trim()) return;
    
    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        deviceId: deviceIdInput.trim(),
        deviceName: `SM-${deviceIdInput.trim()}`,
        pairedAt: Date.now(),
      });
      setDeviceName(`SM-${deviceIdInput.trim()}`);
      setStatus('connected');
    } catch (err) {
      setErrorMsg('Failed to save device ID.');
      setStatus('error');
    }
  }

  if (status === 'connected') {
    return (
      <div className="min-h-dvh flex items-center justify-center p-5 animate-fade-in">
        <div className="w-full max-w-md text-center flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-5xl material-symbols-filled">
              check_circle
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Device Paired!</h1>
          <p className="text-on-surface-variant">
            <strong>{deviceName}</strong> has been successfully connected to your TravelRakshak account.
          </p>
          <div className="bg-secondary-container/30 rounded-2xl p-4 w-full">
            <p className="text-sm text-on-surface-variant">
              Your wearable is now actively monitoring for emergencies. The mesh network will broadcast any SOS signals to nearby responders.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full h-14 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-on-surface-variant">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-xl font-bold text-primary">TravelRakshak</span>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="px-5 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-1.5 rounded-full bg-surface-container-high" />
          <div className="flex-1 h-1.5 rounded-full bg-surface-container-high" />
        </div>
      </div>

      <main className="max-w-md mx-auto px-5">
        <h1 className="text-2xl font-bold text-on-surface mb-2">Connect Your Device</h1>
        <p className="text-on-surface-variant mb-8">
          To begin your protection journey, pair your Sentinel wearable with the mesh network.
        </p>

        {/* Device Illustration */}
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-surface-container-low to-surface-container rounded-3xl flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-primary/20 text-[120px]">watch</span>
        </div>

        {/* Pairing Options */}
        {!pairMethod && (
          <div className="flex flex-col gap-4 mb-6">
            <button
              onClick={() => { setPairMethod('bluetooth'); scanBluetooth(); }}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 card-shadow hover:bg-surface-container-low transition-colors active:scale-[0.98] border border-surface-container"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">bluetooth_searching</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-on-surface">Scan via Bluetooth</p>
                <p className="text-sm text-on-surface-variant">Automatically find nearby devices</p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>

            <button
              onClick={() => setPairMethod('manual')}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 card-shadow hover:bg-surface-container-low transition-colors active:scale-[0.98] border border-surface-container"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">keyboard</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-on-surface">Enter Device ID</p>
                <p className="text-sm text-on-surface-variant">Type the 8-digit code manually</p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
          </div>
        )}

        {/* Bluetooth Scanning State */}
        {pairMethod === 'bluetooth' && status === 'scanning' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-on-surface-variant">Scanning for nearby devices...</p>
          </div>
        )}

        {pairMethod === 'bluetooth' && status === 'connecting' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent mb-4" />
            <p className="text-on-surface-variant">Connecting to {deviceName}...</p>
          </div>
        )}

        {/* Manual Entry */}
        {pairMethod === 'manual' && (
          <div className="flex flex-col gap-4 mb-6">
            <input
              type="text"
              placeholder="Enter Device ID (e.g. SM-8842-XJ90)"
              value={deviceIdInput}
              onChange={(e) => setDeviceIdInput(e.target.value)}
              className="w-full h-14 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
            />
            <button
              onClick={pairManually}
              className="w-full h-14 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all flex items-center justify-center gap-2"
            >
              Pair Device
              <span className="material-symbols-outlined text-[20px]">bluetooth</span>
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {errorMsg}
          </div>
        )}

        {/* Info Callout */}
        <div className="bg-primary-fixed/30 rounded-2xl p-4 flex items-start gap-3 mb-6">
          <span className="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Ensure your device is charged and nearby. The LED should be blinking blue to indicate pairing mode.
          </p>
        </div>

        {/* Skip Option */}
        <div className="text-center pb-8">
          <button
            onClick={() => navigate('/')}
            className="text-on-surface-variant text-sm hover:text-on-surface transition-colors"
          >
            I don't have a device yet
          </button>
        </div>
      </main>
    </div>
  );
}
