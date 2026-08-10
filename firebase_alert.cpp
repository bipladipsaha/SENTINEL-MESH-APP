/*
 * Sentinel Mesh — Firebase SOS Alert
 *
 * When an emergency is triggered, this module writes a compact JSON
 * payload to Firebase Realtime Database via HTTPS PUT (through the
 * SIM800L modem).
 *
 * Firebase path:  /sos_alerts/<deviceId>.json?auth=<API_KEY>
 *
 * A Firebase Cloud Function listening on /sos_alerts/{deviceId}
 * picks up the write, queries nearby app users from /user_locations,
 * and sends them FCM push notifications.
 *
 * This module is **additive** — if Firebase is unreachable, the
 * existing SMS/LoRa/voice-call flow is completely unaffected.
 */

#include "firebase_alert.h"
#include "gsm.h"

// ---- Static buffers ----
static char firebaseUrl[200];
static char firebaseBody[FIREBASE_BODY_SIZE];

// ============================================================
//  Public API
// ============================================================

void initFirebaseAlert() {
    Serial.println("[FIREBASE] Firebase alert module initialized");
    Serial.printf("[FIREBASE] Host: %s\n", FIREBASE_HOST);
}

/*
 * Write the SOS alert to Firebase RTDB.
 *
 * JSON payload:
 * {
 *   "deviceId":  "SM-12345",
 *   "lat":       22.572645,
 *   "lon":       88.363892,
 *   "type":      "MANUAL" | "FALL",
 *   "battery":   85,
 *   "timestamp": 1691500000,
 *   "active":    true
 * }
 *
 * The Cloud Function uses "active: true" as the trigger to
 * fan out push notifications to nearby app users.
 */
bool sendFirebaseSOSAlert() {
    Serial.println("[FIREBASE] Sending SOS alert to Firebase RTDB...");

    // ---- Read shared state ----
    lockState();
    float         lat     = g_state.gps.latitude;
    float         lon     = g_state.gps.longitude;
    bool          gpsOk   = g_state.gps.valid;
    uint8_t       bat     = g_state.battery.percent;
    EmergencyType etype   = g_state.emergencyType;
    const char*   devId   = g_state.deviceIdStr;
    unlockState();

    const char* typeStr = (etype == EMERGENCY_FALL) ? "FALL" : "MANUAL";

    // ---- Build URL ----
    // Firebase REST API:  PUT  https://<host>/sos_alerts/<deviceId>.json?auth=<key>
    snprintf(firebaseUrl, sizeof(firebaseUrl),
             "https://%s/sos_alerts/%s.json?auth=%s",
             FIREBASE_HOST, devId, FIREBASE_AUTH);

    // ---- Build JSON body ----
    if (gpsOk) {
        snprintf(firebaseBody, sizeof(firebaseBody),
                 "{\"deviceId\":\"%s\","
                 "\"lat\":%.6f,\"lon\":%.6f,"
                 "\"type\":\"%s\",\"battery\":%d,"
                 "\"timestamp\":%lu,\"active\":true}",
                 devId, lat, lon, typeStr, bat,
                 (unsigned long)(millis() / 1000UL));
    } else {
        snprintf(firebaseBody, sizeof(firebaseBody),
                 "{\"deviceId\":\"%s\","
                 "\"lat\":0,\"lon\":0,"
                 "\"type\":\"%s\",\"battery\":%d,"
                 "\"timestamp\":%lu,\"active\":true,"
                 "\"gpsStatus\":\"acquiring\"}",
                 devId, typeStr, bat,
                 (unsigned long)(millis() / 1000UL));
    }

    Serial.printf("[FIREBASE] URL: %s\n", firebaseUrl);
    Serial.printf("[FIREBASE] Body: %s\n", firebaseBody);

    // ---- Send via HTTPS PUT ----
    int result = gsmHttpsPut(firebaseUrl, firebaseBody);

    if (result == 200) {
        Serial.println("[FIREBASE] SOS alert written to RTDB ✓");
    } else {
        Serial.printf("[FIREBASE] SOS alert FAILED (code=%d) — other alerts unaffected\n", result);
    }

    // ---- Also notify Vercel backend for nearby user push notifications ----
    Serial.println("[VERCEL] Sending SOS to Vercel backend...");
    char vercelBody[VERCEL_BODY_SIZE];
    snprintf(vercelBody, sizeof(vercelBody),
             "{\"deviceId\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,\"type\":\"%s\",\"battery\":%d,\"timestamp\":%lu,\"active\":true,\"secret\":\"%s\"}",
             devId, lat, lon, typeStr, bat, (unsigned long)(millis() / 1000UL), VERCEL_SECRET);

    int vercelResult = gsmHttpsPost(VERCEL_URL, vercelBody);
    if (vercelResult == 200) {
        Serial.println("[VERCEL] SOS alert sent to nearby users ✓");
    } else {
        Serial.printf("[VERCEL] Failed (code=%d) — Firebase RTDB alert unaffected\n", vercelResult);
    }

    return (result == 200);
}

/*
 * Mark the SOS as resolved in Firebase RTDB.
 * Sets "active: false" so the Cloud Function knows the
 * emergency has ended (and can optionally notify users).
 */
bool sendFirebaseSOSResolved() {
    Serial.println("[FIREBASE] Sending RESOLVED status to Firebase RTDB...");

    lockState();
    const char* devId = g_state.deviceIdStr;
    unlockState();

    snprintf(firebaseUrl, sizeof(firebaseUrl),
             "https://%s/sos_alerts/%s.json?auth=%s",
             FIREBASE_HOST, devId, FIREBASE_AUTH);

    snprintf(firebaseBody, sizeof(firebaseBody),
             "{\"active\":false,\"resolvedAt\":%lu}",
             (unsigned long)(millis() / 1000UL));

    int result = gsmHttpsPut(firebaseUrl, firebaseBody);

    if (result == 200) {
        Serial.println("[FIREBASE] RESOLVED status written ✓");
        return true;
    } else {
        Serial.printf("[FIREBASE] RESOLVED write FAILED (code=%d)\n", result);
        return false;
    }
}
