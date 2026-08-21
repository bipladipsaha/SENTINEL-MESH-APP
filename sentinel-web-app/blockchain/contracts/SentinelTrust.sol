// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SentinelTrust
 * @dev Blockchain-Based Trust & Security Layer for SentinelMesh
 *
 * Provides four core features:
 *   1. Device Identity   — prove the SOS came from an authorized device
 *   2. Device Revocation — immediately invalidate lost/compromised devices
 *   3. Emergency Integrity — detect modification of critical incident records
 *   4. Response Audit Trail — verifiable history of emergency-response actions
 *
 * NOTE: Blockchain provides a tamper-evident and independently verifiable
 * integrity layer for critical Sentinel-Mesh events.  Actual sensitive data
 * (GPS, tourist name, phone, medical info, routes, sensor streams) is stored
 * in Firebase — only SHA-256 hashes are committed here.
 */
contract SentinelTrust {
    address public admin;

    // ───────────────────── Device Identity ─────────────────────

    struct Device {
        bool   isRegistered;
        bool   isRevoked;
        string publicKey;       // hex-encoded public key of the ESP32
        uint256 registeredAt;
    }

    mapping(string => Device) public devices;

    event DeviceRegistered(string deviceId, string publicKey, uint256 timestamp);
    event DeviceRevoked(string deviceId, uint256 timestamp);

    // ───────────────────── Emergency Integrity ─────────────────

    struct Incident {
        string  hash;           // SHA-256 of deterministic incident payload
        uint256 timestamp;
        bool    exists;
    }

    mapping(string => Incident) public incidents;

    event IncidentLogged(string incidentId, string hash, uint256 timestamp);

    // ───────────────────── Response Audit Trail ────────────────

    struct ResponseAction {
        string  incidentId;
        string  action;         // e.g. "sos_triggered", "acknowledged", "responder_assigned", "resolved"
        string  hash;           // SHA-256 of the action payload
        uint256 timestamp;
    }

    ResponseAction[] public auditLog;

    event ResponseLogged(string incidentId, string action, string hash, uint256 timestamp);

    // ───────────────────── Modifiers ───────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════
    //  1. DEVICE IDENTITY
    // ═══════════════════════════════════════════════════════════

    /**
     * @dev Register a new ESP32 device with its public key.
     */
    function registerDevice(
        string memory deviceId,
        string memory publicKey
    ) public onlyAdmin {
        require(!devices[deviceId].isRegistered, "Device already registered");
        devices[deviceId] = Device({
            isRegistered: true,
            isRevoked: false,
            publicKey: publicKey,
            registeredAt: block.timestamp
        });
        emit DeviceRegistered(deviceId, publicKey, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════
    //  2. DEVICE REVOCATION
    // ═══════════════════════════════════════════════════════════

    /**
     * @dev Revoke a compromised or lost device.
     */
    function revokeDevice(string memory deviceId) public onlyAdmin {
        require(devices[deviceId].isRegistered, "Device not registered");
        require(!devices[deviceId].isRevoked,   "Device already revoked");
        devices[deviceId].isRevoked = true;
        emit DeviceRevoked(deviceId, block.timestamp);
    }

    /**
     * @dev Check whether a device is currently authorized to transmit.
     */
    function isDeviceActive(string memory deviceId) public view returns (bool) {
        return devices[deviceId].isRegistered && !devices[deviceId].isRevoked;
    }

    /**
     * @dev Retrieve the stored public key for signature verification.
     */
    function getDevicePublicKey(string memory deviceId) public view returns (string memory) {
        require(devices[deviceId].isRegistered, "Device not registered");
        return devices[deviceId].publicKey;
    }

    // ═══════════════════════════════════════════════════════════
    //  3. EMERGENCY INTEGRITY
    // ═══════════════════════════════════════════════════════════

    /**
     * @dev Store the immutable SHA-256 hash of an emergency incident.
     *      The hash is generated server-side from Firebase data — never
     *      from the browser — to prevent a compromised frontend from
     *      submitting manipulated hashes.
     */
    function logIncidentHash(
        string memory incidentId,
        string memory incidentHash
    ) public onlyAdmin {
        require(!incidents[incidentId].exists, "Incident already logged");
        incidents[incidentId] = Incident({
            hash: incidentHash,
            timestamp: block.timestamp,
            exists: true
        });
        emit IncidentLogged(incidentId, incidentHash, block.timestamp);
    }

    /**
     * @dev Retrieve the hash of an incident for verification.
     */
    function getIncidentHash(string memory incidentId) public view returns (string memory) {
        require(incidents[incidentId].exists, "Incident not found");
        return incidents[incidentId].hash;
    }

    // ═══════════════════════════════════════════════════════════
    //  4. RESPONSE AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════

    /**
     * @dev Append a timestamped, hash-verified response action.
     *      Examples: "sos_triggered", "acknowledged", "responder_assigned",
     *                "responder_arrived", "resolved"
     */
    function logResponseAction(
        string memory incidentId,
        string memory action,
        string memory actionHash
    ) public onlyAdmin {
        auditLog.push(ResponseAction({
            incidentId: incidentId,
            action: action,
            hash: actionHash,
            timestamp: block.timestamp
        }));
        emit ResponseLogged(incidentId, action, actionHash, block.timestamp);
    }

    /**
     * @dev Get the total number of audit log entries.
     */
    function getAuditLogCount() public view returns (uint256) {
        return auditLog.length;
    }
}
