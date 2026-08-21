import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────

let CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL ||
  'https://myproject7698-default-rtdb.asia-southeast1.firebasedatabase.app';

// Updated ABI to match the upgraded SentinelTrust.sol
const abi = [
  'function registerDevice(string memory deviceId, string memory publicKey) public',
  'function revokeDevice(string memory deviceId) public',
  'function isDeviceActive(string memory deviceId) public view returns (bool)',
  'function getDevicePublicKey(string memory deviceId) public view returns (string memory)',
  'function logIncidentHash(string memory incidentId, string memory incidentHash) public',
  'function getIncidentHash(string memory incidentId) public view returns (string memory)',
  'function logResponseAction(string memory incidentId, string memory action, string memory actionHash) public',
  'function getAuditLogCount() public view returns (uint256)',
];

// ──────────────────────────────────────────────────────────────
//  ETHEREUM  (Hardhat local node)
// ──────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
// Hardhat Account #0 — development only, never use in production
const privateKey =
  process.env.PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new ethers.Wallet(privateKey, provider);

let contract;
if (CONTRACT_ADDRESS) {
  contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
}

// ──────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────

const checkContract = (_req, res, next) => {
  if (!contract) {
    return res.status(500).json({
      error: 'Contract address not set. Deploy the contract first.',
    });
  }
  next();
};

/**
 * Generate a deterministic SHA-256 hash from incident data.
 * Fields are sorted in a fixed, canonical order so that minor
 * formatting differences never produce a different hash.
 *
 * IMPORTANT: This function must be identical on both the backend
 * (here) and wherever the frontend performs local verification,
 * so that hashes always match when data is untampered.
 */
function deterministicIncidentHash(incident) {
  const canonical =
    `incidentId:${incident.id}` +
    `|deviceId:${incident.deviceId}` +
    `|lat:${incident.lat}` +
    `|lon:${incident.lon}` +
    `|timestamp:${incident.timestamp}` +
    `|type:${incident.type}`;
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Fetch an SOS incident directly from Firebase Realtime Database.
 * This is the authoritative data source — the browser never provides
 * the raw data used for hashing.
 */
async function fetchIncidentFromFirebase(incidentId) {
  const url = `${FIREBASE_DB_URL}/sos_alerts/${incidentId}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firebase fetch failed: ${res.status}`);
  const data = await res.json();
  if (!data) throw new Error('Incident not found in Firebase');
  return {
    id: incidentId,
    deviceId: data.deviceId || incidentId,
    lat: data.lat,
    lon: data.lon,
    timestamp: data.timestamp,
    type: data.type,
  };
}

// ──────────────────────────────────────────────────────────────
//  ROUTES — Contract Management
// ──────────────────────────────────────────────────────────────

app.post('/api/set-contract', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });
  CONTRACT_ADDRESS = address;
  contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  res.json({ message: 'Contract address updated', address });
});

// ──────────────────────────────────────────────────────────────
//  ROUTES — Device Identity & Revocation
// ──────────────────────────────────────────────────────────────

app.post('/api/register', checkContract, async (req, res) => {
  const { deviceId, publicKey } = req.body;
  if (!deviceId || !publicKey) {
    return res.status(400).json({ error: 'deviceId and publicKey required' });
  }
  try {
    const tx = await contract.registerDevice(deviceId, publicKey);
    const receipt = await tx.wait();
    res.json({ message: 'Device registered', txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/revoke', checkContract, async (req, res) => {
  const { deviceId } = req.body;
  try {
    const tx = await contract.revokeDevice(deviceId);
    const receipt = await tx.wait();
    res.json({ message: 'Device revoked', txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/device-status/:deviceId', checkContract, async (req, res) => {
  try {
    const active = await contract.isDeviceActive(req.params.deviceId);
    res.json({ deviceId: req.params.deviceId, active });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
//  ROUTES — Emergency Integrity  (hash generated SERVER-SIDE)
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/log-incident
 * Body: { incidentId }
 *
 * The backend fetches the incident from Firebase, generates the
 * deterministic SHA-256 hash itself, and commits it to the
 * blockchain.  The browser never supplies the hash.
 *
 * PROTOTYPE NOTE: In a production system the ESP32 would sign
 * the SOS payload with its private key, and this endpoint would
 * verify the signature against the on-chain public key before
 * accepting the incident.
 */
app.post('/api/log-incident', checkContract, async (req, res) => {
  const { incidentId } = req.body;
  if (!incidentId) {
    return res.status(400).json({ error: 'incidentId required' });
  }
  try {
    // 1. Fetch authoritative data from Firebase
    const incident = await fetchIncidentFromFirebase(incidentId);

    // 2. Generate hash server-side
    const incidentHash = deterministicIncidentHash(incident);

    // 3. Commit hash to blockchain
    const tx = await contract.logIncidentHash(incidentId, incidentHash);
    const receipt = await tx.wait();

    res.json({
      message: 'Incident hash committed to blockchain',
      txHash: receipt.hash,
      incidentHash,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/verify-incident/:incidentId
 *
 * Re-fetches the incident from Firebase, re-hashes it, and compares
 * against the immutable blockchain record.  Returns the verification
 * result so the Command Center can display ✓ VERIFIED or ⚠️ TAMPERED.
 */
app.get('/api/verify-incident/:incidentId', checkContract, async (req, res) => {
  const { incidentId } = req.params;
  try {
    // 1. Get on-chain hash
    const blockchainHash = await contract.getIncidentHash(incidentId);

    // 2. Re-fetch current Firebase data and re-hash
    const incident = await fetchIncidentFromFirebase(incidentId);
    const currentHash = deterministicIncidentHash(incident);

    // 3. Compare
    const verified = currentHash === blockchainHash;

    res.json({
      incidentId,
      verified,
      blockchainHash,
      currentHash,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
//  ROUTES — Response Audit Trail
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/log-response
 * Body: { incidentId, action }
 *
 * Logs a timestamped response action (e.g. "acknowledged",
 * "responder_assigned", "resolved") to the blockchain.
 */
app.post('/api/log-response', checkContract, async (req, res) => {
  const { incidentId, action } = req.body;
  if (!incidentId || !action) {
    return res.status(400).json({ error: 'incidentId and action required' });
  }
  try {
    const actionPayload = `incidentId:${incidentId}|action:${action}|time:${Date.now()}`;
    const actionHash = crypto.createHash('sha256').update(actionPayload).digest('hex');

    const tx = await contract.logResponseAction(incidentId, action, actionHash);
    const receipt = await tx.wait();

    res.json({
      message: `Response action "${action}" logged`,
      txHash: receipt.hash,
      actionHash,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audit-count', checkContract, async (_req, res) => {
  try {
    const count = await contract.getAuditLogCount();
    res.json({ count: Number(count) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
//  START
// ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  Sentinel Blockchain API`);
  console.log(`  Port:    ${PORT}`);
  console.log(`  Wallet:  ${wallet.address}`);
  console.log(`  Contract: ${CONTRACT_ADDRESS || '(not set — POST /api/set-contract)'}\n`);
});
