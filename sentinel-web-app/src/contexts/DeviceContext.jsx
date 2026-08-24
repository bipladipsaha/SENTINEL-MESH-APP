/*
 * SentinelMesh — Device Context (BLE Proxy)
 *
 * Manages the persistent Web Bluetooth connection to the ESP32.
 * Listens for SOS notifications from the ESP32 and automatically
 * writes them to Firebase, acting as a proxy when GSM fails.
 *
 * Reliability features:
 *   • BLE notification listener (primary)
 *   • Polling fallback — reads alert characteristic every 2s as a safety net
 *     for missed notifications (BLE notify is inherently lossy)
 *   • Deduplication — prevents double-processing via timestamp tracking
 *   • Non-blocking geolocation — writes SOS to Firebase immediately, patches
 *     GPS coordinates asynchronously
 *   • Graceful handling when userProfile hasn't loaded yet
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { ref, update, set } from 'firebase/database';
import { toast } from 'react-hot-toast';

const DeviceContext = createContext();

export function useDevice() {
  return useContext(DeviceContext);
}

const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const BLE_DEVICE_ID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_ALERT_CHAR_UUID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'; // Characteristic for SOS alerts

// Polling interval for reading alert characteristic as a fallback (ms)
const ALERT_POLL_INTERVAL_MS = 2000;

// Deduplication window — ignore duplicate alert payloads within this window (ms)
const DEDUP_WINDOW_MS = 10000;

export function DeviceProvider({ children }) {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [bleDevice, setBleDevice] = useState(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceBattery, setDeviceBattery] = useState(100);
  
  // References to keep track of characteristic subscriptions and polling
  const alertCharRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const connectedRef = useRef(false);

  // Keep refs in sync with latest auth/profile to avoid stale closures
  const currentUserRef = useRef(currentUser);
  const userProfileRef = useRef(userProfile);
  const deviceBatteryRef = useRef(deviceBattery);
  const navigateRef = useRef(navigate);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);
  useEffect(() => { deviceBatteryRef.current = deviceBattery; }, [deviceBattery]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Deduplication: track the last processed alert message + timestamp
  const lastProcessedAlertRef = useRef({ message: '', timestamp: 0 });

  // The device ID read from BLE during pairing (kept in a ref so polling can use it)
  const pairedDeviceIdRef = useRef(null);

  /**
   * Core alert handler — processes a raw alert string from the ESP32.
   * Called by both the notification listener AND the polling fallback.
   * Includes deduplication to prevent double-processing.
   */
  const processAlert = useCallback(async (alertMessage) => {
    if (!alertMessage || alertMessage.length === 0) return;

    // --- Deduplication ---
    const now = Date.now();
    const last = lastProcessedAlertRef.current;
    if (
      alertMessage === last.message &&
      now - last.timestamp < DEDUP_WINDOW_MS
    ) {
      // Same payload within the dedup window — skip
      return;
    }
    lastProcessedAlertRef.current = { message: alertMessage, timestamp: now };

    console.log('[BLE Proxy] Processing alert from ESP32:', alertMessage);
    toast.success(`BLE Signal Received: ${alertMessage}`, { duration: 4000 });

    const parts = alertMessage.split('|');
    const typeStr = parts[0];

    if (typeStr === 'SOS' || typeStr === 'FALL' || typeStr.startsWith('SOS')) {
      const espLat = parts.length > 1 ? parseFloat(parts[1]) : 0;
      const espLon = parts.length > 2 ? parseFloat(parts[2]) : 0;

      // Proxy the SOS to Firebase
      await proxySOSToFirebase(true, typeStr, espLat, espLon);
      
      // Navigate user to the active SOS screen so they know it triggered
      navigateRef.current('/sos-active');
      
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
      }
    } else if (typeStr === 'RESOLVED') {
      await proxySOSToFirebase(false, typeStr, 0, 0);
      navigateRef.current('/');
    }
  }, []); // stable — all mutable state accessed via refs

  /**
   * BLE notification event handler — delegates to processAlert.
   */
  const handleAlertNotification = useCallback((event) => {
    try {
      const value = event.target.value;
      const decoder = new TextDecoder('utf-8');
      const alertMessage = decoder.decode(value);
      processAlert(alertMessage);
    } catch (err) {
      console.error('[BLE Proxy] Error handling notification event:', err);
    }
  }, [processAlert]);

  /**
   * Polling fallback — reads the alert characteristic value directly.
   * This catches SOS signals that were missed by the notification path
   * (e.g., due to BLE stack buffering, timing issues, or the browser
   * failing to deliver the characteristicvaluechanged event).
   */
  const pollAlertCharacteristic = useCallback(async () => {
    const char = alertCharRef.current;
    if (!char || !connectedRef.current) return;

    try {
      const value = await char.readValue();
      const decoder = new TextDecoder('utf-8');
      const alertMessage = decoder.decode(value).trim();

      // Only process non-empty, actionable messages
      if (alertMessage && alertMessage.length > 0 && alertMessage !== 'IDLE' && alertMessage !== 'OK' && alertMessage !== '') {
        await processAlert(alertMessage);
      }
    } catch (err) {
      // readValue can throw if the device disconnected — that's expected
      if (err.name !== 'NetworkError' && err.name !== 'NotSupportedError') {
        console.warn('[BLE Poll] Read failed:', err.message);
      }
    }
  }, [processAlert]);

  /**
   * Start polling the alert characteristic as a fallback.
   */
  function startAlertPolling() {
    stopAlertPolling(); // clear any existing interval
    console.log('[BLE] Starting alert polling fallback (every %dms)', ALERT_POLL_INTERVAL_MS);
    pollIntervalRef.current = setInterval(pollAlertCharacteristic, ALERT_POLL_INTERVAL_MS);
  }

  /**
   * Stop the polling fallback.
   */
  function stopAlertPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  /**
   * Proxy an SOS (or resolution) to Firebase.
   *
   * Key reliability improvement: if userProfile hasn't loaded yet, we still
   * attempt to write using the device ID we read during BLE pairing
   * (pairedDeviceIdRef). Previously this would silently return, dropping
   * the SOS entirely.
   *
   * GPS is also handled non-blocking: we write to Firebase immediately
   * with whatever coordinates we have, then asynchronously patch better
   * GPS coordinates when the phone resolves its position.
   */
  async function proxySOSToFirebase(active, typeStr, espLat, espLon) {
    const user = currentUserRef.current;
    const profile = userProfileRef.current;

    if (!user) {
      console.error('[BLE Proxy] Cannot proxy SOS — no authenticated user');
      return;
    }

    // Use multiple fallbacks for device ID
    const deviceId =
      profile?.deviceId ||
      pairedDeviceIdRef.current ||
      `web-${user.uid.slice(0, 8)}`;
    
    if (!active) {
      // Resolve emergency
      try {
        await update(ref(db, `sos_alerts/${deviceId}`), { active: false });
        console.log('[BLE Proxy] Forwarded RESOLVED to Firebase');
      } catch (err) {
        console.error('Firebase resolve error:', err);
      }
      return;
    }

    // --- Phase 1: Write SOS to Firebase IMMEDIATELY with whatever GPS we have ---
    let lat = espLat;
    let lon = espLon;
    const hasValidESPGps = lat && lon && !(lat === 0 && lon === 0) && !isNaN(lat) && !isNaN(lon);

    // If ESP32 GPS is invalid, try localStorage cache (instant, non-blocking)
    if (!hasValidESPGps) {
      try {
        const savedLoc = localStorage.getItem('last_known_loc');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          lat = parsed.lat || 0;
          lon = parsed.lon || 0;
          console.log('[BLE Proxy] Using cached GPS:', lat, lon);
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    const sosData = {
      deviceId,
      lat: lat || 0,
      lon: lon || 0,
      type: (typeStr === 'FALL' || typeStr === 'SOS_FALL') ? 'FALL' : 'MANUAL_SOS',
      battery: deviceBatteryRef.current,
      active: true,
      timestamp: Date.now(),
      userId: user.uid,
      userName: profile?.name || 'Unknown',
      proxiedViaBLE: true // Flag indicating it came via the web app
    };

    try {
      await set(ref(db, `sos_alerts/${deviceId}`), sosData);
      console.log('[BLE Proxy] SOS written to Firebase (Phase 1 — immediate)');
    } catch (err) {
      console.error('[BLE Proxy] Firebase write error:', err);
      return; // Don't attempt GPS patch if the initial write failed
    }

    // --- Phase 2: Asynchronously patch better GPS if we don't have a valid fix ---
    if (!hasValidESPGps && (!lat || !lon || (lat === 0 && lon === 0))) {
      // Fire-and-forget GPS resolution — does NOT block the SOS display
      (async () => {
        try {
          console.log('[BLE Proxy] Phase 2: Attempting phone GPS fix...');
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 8000,
              enableHighAccuracy: true,
            });
          });
          const phoneLat = pos.coords.latitude;
          const phoneLon = pos.coords.longitude;

          // Patch the existing SOS alert with better coordinates
          await update(ref(db, `sos_alerts/${deviceId}`), {
            lat: phoneLat,
            lon: phoneLon,
          });
          console.log('[BLE Proxy] Phase 2: Patched GPS →', phoneLat, phoneLon);
        } catch (gpsErr) {
          console.warn('[BLE Proxy] Phase 2: Phone GPS failed, trying Firebase last-known...');
          try {
            const { get } = await import('firebase/database');
            const snapshot = await get(ref(db, `user_locations/${user.uid}`));
            if (snapshot.exists()) {
              const data = snapshot.val();
              if (data.lat && data.lon) {
                await update(ref(db, `sos_alerts/${deviceId}`), {
                  lat: data.lat,
                  lon: data.lon,
                });
                console.log('[BLE Proxy] Phase 2: Patched GPS from Firebase →', data.lat, data.lon);
              }
            }
          } catch (fbErr) {
            console.error('[BLE Proxy] Phase 2: All GPS fallbacks exhausted:', fbErr);
          }
        }
      })();
    }
  }

  const resolveEmergencyBLE = useCallback(async () => {
    if (alertCharRef.current && connectedRef.current) {
      try {
        const encoder = new TextEncoder();
        await alertCharRef.current.writeValue(encoder.encode('RESOLVE'));
        console.log('[BLE Proxy] Sent remote RESOLVE to ESP32');
      } catch (err) {
        console.warn('[BLE Proxy] Failed to send RESOLVE via BLE:', err);
      }
    }
  }, []);

  function onDisconnected() {
    console.log('[BLE] Disconnected from ESP32');
    connectedRef.current = false;
    setDeviceConnected(false);
    setBleDevice(null);
    alertCharRef.current = null;
    stopAlertPolling();
  }

  async function handleBatteryNotification(event) {
    const value = event.target.value;
    const batteryLevel = value.getUint8(0);
    setDeviceBattery(batteryLevel);
  }

  async function scanAndConnect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
        optionalServices: [BLE_SERVICE_UUID, 0x180F],
      });

      device.addEventListener('gattserverdisconnected', onDisconnected);
      setBleDevice(device);

      const server = await device.gatt.connect();
      
      // 1. Primary Service
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);

      // Read Device ID
      const idChar = await service.getCharacteristic(BLE_DEVICE_ID_CHAR_UUID);
      const idValue = await idChar.readValue();
      const decoder = new TextDecoder('utf-8');
      const deviceIdStr = decoder.decode(idValue);
      pairedDeviceIdRef.current = deviceIdStr;

      // Save device ID to user profile
      if (currentUser) {
        await update(ref(db, `users/${currentUser.uid}`), {
          deviceId: deviceIdStr,
          deviceName: device.name || deviceIdStr,
          pairedAt: Date.now(),
        });
      }

      // Subscribe to Alert Notifications (primary path)
      try {
        const alertChar = await service.getCharacteristic(BLE_ALERT_CHAR_UUID);
        alertCharRef.current = alertChar;
        await alertChar.startNotifications();
        alertChar.addEventListener('characteristicvaluechanged', handleAlertNotification);
        console.log('[BLE] Subscribed to ESP32 SOS alerts (notification listener)');
      } catch (err) {
        console.warn('[BLE] Could not subscribe to alert characteristic:', err);
      }
      
      // 2. Battery Service
      try {
        const batteryService = await server.getPrimaryService(0x180F);
        const batteryChar = await batteryService.getCharacteristic(0x2A19);
        const batVal = await batteryChar.readValue();
        setDeviceBattery(batVal.getUint8(0)); // Initial read
        
        await batteryChar.startNotifications();
        batteryChar.addEventListener('characteristicvaluechanged', handleBatteryNotification);
        console.log('[BLE] Subscribed to battery updates');
      } catch (err) {
        console.warn('[BLE] Could not subscribe to battery characteristic:', err);
      }

      connectedRef.current = true;
      setDeviceConnected(true);

      // Start polling fallback for alert characteristic reliability
      startAlertPolling();

      // Clear any stale state in Firebase if ESP32 is currently IDLE
      try {
        if (alertCharRef.current) {
          const initialVal = await alertCharRef.current.readValue();
          const initialMsg = new TextDecoder('utf-8').decode(initialVal).trim();
          if (initialMsg === 'IDLE' || initialMsg === 'RESOLVED') {
            const userId = currentUserRef.current?.uid;
            if (userId) {
              const fbDeviceId = userProfileRef.current?.deviceId || deviceIdStr || `web-${userId.slice(0, 8)}`;
              await update(ref(db, `sos_alerts/${fbDeviceId}`), { active: false });
              console.log('[BLE Proxy] Cleared stale active state in Firebase on connect');
            }
          }
        }
      } catch (err) {
        console.warn('[BLE Proxy] Failed to read initial characteristic state:', err);
      }

      return deviceIdStr;
    } catch (err) {
      console.error('[BLE] Connection failed:', err);
      throw err;
    }
  }

  function disconnect() {
    if (bleDevice && bleDevice.gatt.connected) {
      bleDevice.gatt.disconnect();
    }
    stopAlertPolling();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAlertPolling();
    };
  }, []);

  const value = {
    scanAndConnect,
    disconnect,
    deviceConnected,
    deviceBattery,
    resolveEmergencyBLE
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}
