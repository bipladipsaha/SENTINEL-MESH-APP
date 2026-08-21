/**
 * SentinelMesh — Frontend Blockchain Service
 *
 * The frontend NEVER generates the incident hash.  All hashing is
 * performed server-side by the Blockchain API, which fetches the
 * authoritative data directly from Firebase.
 *
 * PROTOTYPE LIMITATION: In a production system the browser should
 * not be trusted to trigger blockchain writes at all — the backend
 * would listen to Firebase events automatically.  For this prototype,
 * the frontend simply tells the API "this incident exists, go hash it".
 */

const API_URL = 'http://localhost:3001/api';

// ──────── Device Identity ────────

export const registerDeviceOnBlockchain = async (deviceId, publicKey) => {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, publicKey }),
    });
    return await res.json();
  } catch (err) {
    console.error('Blockchain device registration failed:', err);
    return null;
  }
};

export const revokeDeviceOnBlockchain = async (deviceId) => {
  try {
    const res = await fetch(`${API_URL}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    return await res.json();
  } catch (err) {
    console.error('Blockchain device revocation failed:', err);
    return null;
  }
};

export const getDeviceStatus = async (deviceId) => {
  try {
    const res = await fetch(`${API_URL}/device-status/${deviceId}`);
    return await res.json();
  } catch (err) {
    console.error('Blockchain device status check failed:', err);
    return null;
  }
};

// ──────── Emergency Integrity ────────

/**
 * Tell the backend to fetch the incident from Firebase, hash it
 * server-side, and commit the hash to the blockchain.
 */
export const logIncidentToBlockchain = async (incidentId) => {
  try {
    const res = await fetch(`${API_URL}/log-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId }),
    });
    return await res.json();
  } catch (err) {
    console.error('Blockchain incident logging failed:', err);
    return null;
  }
};

/**
 * Ask the backend to re-fetch the incident from Firebase, re-hash it,
 * and compare against the immutable on-chain hash.
 */
export const verifyIncidentIntegrity = async (incidentId) => {
  try {
    const res = await fetch(`${API_URL}/verify-incident/${incidentId}`);
    const data = await res.json();
    return data; // { incidentId, verified, blockchainHash, currentHash }
  } catch (err) {
    console.error('Blockchain verification failed:', err);
    return { verified: false, error: err.message };
  }
};

// ──────── Response Audit Trail ────────

export const logResponseAction = async (incidentId, action) => {
  try {
    const res = await fetch(`${API_URL}/log-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, action }),
    });
    return await res.json();
  } catch (err) {
    console.error('Blockchain response action logging failed:', err);
    return null;
  }
};
