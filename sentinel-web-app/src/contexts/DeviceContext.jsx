/*
 * SentinelMesh — Device Context (BLE Proxy)
 *
 * Manages the persistent Web Bluetooth connection to the ESP32.
 * Listens for SOS notifications from the ESP32 and automatically
 * writes them to Firebase, acting as a proxy when GSM fails.
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { ref, update, set } from 'firebase/database';

const DeviceContext = createContext();

export function useDevice() {
  return useContext(DeviceContext);
}

const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const BLE_DEVICE_ID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_ALERT_CHAR_UUID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'; // New characteristic for SOS alerts

export function DeviceProvider({ children }) {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [bleDevice, setBleDevice] = useState(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceBattery, setDeviceBattery] = useState(100); // We could add a battery characteristic later
  
  // References to keep track of characteristic subscriptions
  const alertCharRef = useRef(null);

  // Automatically attempt to reconnect if disconnected? Web Bluetooth requires user gesture to connect.
  // So we can't auto-reconnect on load without user interaction.

  // Use a ref to hold the latest handler to avoid stale closures in the event listener
  const latestHandlerRef = useRef();

  useEffect(() => {
    latestHandlerRef.current = async (event) => {
      const value = event.target.value;
      const decoder = new TextDecoder('utf-8');
      const alertMessage = decoder.decode(value);
      
      console.log('[BLE Proxy] Received alert from ESP32:', alertMessage);

      const parts = alertMessage.split('|');
      const typeStr = parts[0];

      if (typeStr.startsWith('SOS')) {
        const espLat = parts.length > 1 ? parseFloat(parts[1]) : 0;
        const espLon = parts.length > 2 ? parseFloat(parts[2]) : 0;

        // Proxy the SOS to Firebase
        await proxySOSToFirebase(true, typeStr, espLat, espLon);
        
        // Navigate user to the active SOS screen so they know it triggered
        navigate('/sos-active');
        
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500]);
        }
      } else if (typeStr === 'RESOLVED') {
        await proxySOSToFirebase(false, typeStr, 0, 0);
        navigate('/');
      }
    };
  }, [navigate, currentUser, userProfile, deviceBattery]);

  async function handleAlertNotification(event) {
    if (latestHandlerRef.current) {
      await latestHandlerRef.current(event);
    }
  }

  async function proxySOSToFirebase(active, typeStr, espLat, espLon) {
    if (!currentUser || !userProfile) return;
    
    const deviceId = userProfile.deviceId || `web-${currentUser.uid.slice(0, 8)}`;
    
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

    // Use ESP32 GPS if available, otherwise fallback to Phone GPS
    let lat = espLat;
    let lon = espLon;

    if (!lat || !lon || (lat === 0 && lon === 0) || isNaN(lat) || isNaN(lon)) {
      console.log('[BLE Proxy] ESP32 has no GPS lock (or 0.0000). Falling back to phone GPS...');
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 8000, 
            enableHighAccuracy: true 
          });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) {
        console.warn('[BLE Proxy] Could not get Phone GPS. Checking if we have a saved location...');
        // Try to fetch last known location from Firebase as absolute last resort
        try {
          const { get } = await import('firebase/database');
          const snapshot = await get(ref(db, `user_locations/${currentUser.uid}`));
          if (snapshot.exists()) {
            const data = snapshot.val();
            lat = data.lat || 0;
            lon = data.lon || 0;
            console.log('[BLE Proxy] Successfully retrieved last known location from Firebase:', lat, lon);
          }
        } catch (fbErr) {
          console.error('[BLE Proxy] Failed to get fallback location from Firebase:', fbErr);
          lat = 0;
          lon = 0;
        }
      }
    }

    const sosData = {
      deviceId,
      lat,
      lon,
      type: typeStr === 'SOS_FALL' ? 'FALL' : 'MANUAL_SOS',
      battery: deviceBattery,
      active: true,
      timestamp: Date.now(),
      userId: currentUser.uid,
      userName: userProfile.name || 'Unknown',
      proxiedViaBLE: true // Flag indicating it came via the web app
    };

    try {
      await set(ref(db, `sos_alerts/${deviceId}`), sosData);
      console.log('[BLE Proxy] Successfully forwarded SOS to Firebase!');
    } catch (err) {
      console.error('[BLE Proxy] Firebase write error:', err);
    }
  }

  function onDisconnected() {
    console.log('[BLE] Disconnected from ESP32');
    setDeviceConnected(false);
    setBleDevice(null);
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

      // Save device ID to user profile
      if (currentUser) {
        await update(ref(db, `users/${currentUser.uid}`), {
          deviceId: deviceIdStr,
          deviceName: device.name || deviceIdStr,
          pairedAt: Date.now(),
        });
      }

      // Subscribe to Alert Notifications
      try {
        const alertChar = await service.getCharacteristic(BLE_ALERT_CHAR_UUID);
        alertCharRef.current = alertChar;
        await alertChar.startNotifications();
        alertChar.addEventListener('characteristicvaluechanged', handleAlertNotification);
        console.log('[BLE] Subscribed to ESP32 SOS alerts');
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

      setDeviceConnected(true);
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
  }

  const value = {
    scanAndConnect,
    disconnect,
    deviceConnected,
    deviceBattery
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}
