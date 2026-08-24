/*
 * Sentinel Mesh — Communication Manager
 *
 * Coordinates all outbound communication in response to emergency
 * state changes.  The Emergency task owns state transitions;
 * this manager reacts to them.
 *
 * Communication priority (per project requirement):
 *
 *   1. LoRa Broadcast   — alerts nearby responders immediately
 *   2. SMS              — fast fallback to emergency contacts
 *   3. GPRS Upload      — starts continuous live tracking
 *   4. Voice Call       — last, because it occupies the GSM module
 *
 * During TRANSMITTING, continuously:
 *   • LoRa broadcast every 5 s
 *   • GPRS upload every 4 s
 *   • GSM recovery check every 30 s
 */

#include "communication.h"
#include "lora_manager.h"
#include "gsm.h"
#include "firebase_alert.h"
#include "ble_manager.h"

// ---- Internal state ----
static bool          initialAlertsSent = false;
static bool          gprsReady         = false;
static bool          callMade          = false;
static unsigned long lastLoRaBroadcast = 0;
static unsigned long lastGPRSUpload    = 0;
static unsigned long lastRecoveryCheck = 0;
static unsigned long lastBLENotify     = 0;

// BLE re-notification interval (ms) — sends alert every 3s during active transmission
#define BLE_RENOTIFY_INTERVAL 3000

// ---- Static message buffers ----
static char smsMsgBuf[SMS_BUFFER_SIZE];
static char httpBodyBuf[HTTP_BODY_SIZE];

// ============================================================
//  Message builders (read shared state under mutex)
// ============================================================

static void buildSMSMessage() {
    lockState();
    float lat           = g_state.gps.latitude;
    float lon           = g_state.gps.longitude;
    bool  gpsValid      = g_state.gps.valid;
    uint8_t bat         = g_state.battery.percent;
    EmergencyType etype = g_state.emergencyType;
    unlockState();

    const char* typeStr = (etype == EMERGENCY_FALL) ? "FALL DETECTED"
                                                    : "SOS BUTTON";
    if (gpsValid) {
        snprintf(smsMsgBuf, sizeof(smsMsgBuf),
                 "SENTINEL MESH EMERGENCY!\n"
                 "Type: %s\n"
                 "Battery: %d%%\n"
                 "Location:\n"
                 "https://maps.google.com/?q=%.6f,%.6f",
                 typeStr, bat, lat, lon);
    } else {
        snprintf(smsMsgBuf, sizeof(smsMsgBuf),
                 "SENTINEL MESH EMERGENCY!\n"
                 "Type: %s\n"
                 "Battery: %d%%\n"
                 "GPS: Acquiring signal...",
                 typeStr, bat);
    }
}

static void buildHTTPBody() {
    lockState();
    float lat   = g_state.gps.latitude;
    float lon   = g_state.gps.longitude;
    uint8_t bat = g_state.battery.percent;
    uint8_t sos = (uint8_t)g_state.emergencyType;
    unlockState();

    const char* status = (sos > 0) ? "ACTIVE" : "IDLE";

    lockState();
    const char* devId = g_state.deviceIdStr;
    unlockState();

    snprintf(httpBodyBuf, sizeof(httpBodyBuf),
             "{\"status\":\"%s\",\"deviceID\":\"%s\",\"lat\":%.6f,\"lng\":%.6f,\"gps\":\"OK\",\"gps_live\":true,\"timestamp\":%lu}",
             status, devId, lat, lon,
             (unsigned long)(millis()));
}

// ============================================================
//  Initial alert sequence (runs once per emergency)
// ============================================================

static void sendInitialAlerts() {
    Serial.println("[COMM] ═══ INITIAL ALERTS ═══");

    // ---- 1. LoRa Broadcast ----
    Serial.println("[COMM] [1/5] LoRa broadcast");
    LoRaPacket pkt = buildEmergencyPacket();
    sendLoRaPacket(pkt);
    lastLoRaBroadcast = millis();

    // Give battery time to recover from LoRa's 20dBm TX burst before putting a load on the SIM800L
    vTaskDelay(pdMS_TO_TICKS(2000));
    
    // ---- 1.25. BLE Web App Proxy ----
    if (getEmergencyState() == STATE_RESOLVED) return;
    Serial.println("[COMM] [1.5/5] BLE Proxy Notification");
    
    lockState();
    EmergencyType etype = g_state.emergencyType;
    float lat = g_state.gps.latitude;
    float lon = g_state.gps.longitude;
    unlockState();
    
    char bleMsg[64];
    if (etype == EMERGENCY_FALL) {
        snprintf(bleMsg, sizeof(bleMsg), "FALL|%.4f|%.4f", lat, lon);
    } else {
        snprintf(bleMsg, sizeof(bleMsg), "SOS|%.4f|%.4f", lat, lon);
    }
    notifyBLEAlert(bleMsg);
    lastBLENotify = millis();
    // After a short delay, reset to IDLE so the web app's polling fallback
    // can distinguish fresh alerts from stale ones
    vTaskDelay(pdMS_TO_TICKS(500));
    notifyBLEAlert("IDLE");
    vTaskDelay(pdMS_TO_TICKS(500));

    // ---- 1.5. Firebase RTDB → push notifications to nearby app users ----
    if (getEmergencyState() == STATE_RESOLVED) return;
    Serial.println("[COMM] [2/5] Firebase push notification trigger");
    sendFirebaseSOSAlert();   // Non-blocking; failure won't stop other alerts
    vTaskDelay(pdMS_TO_TICKS(1000));

    // ---- 2. SMS to all contacts ----
    if (getEmergencyState() == STATE_RESOLVED) return;
    Serial.println("[COMM] [3/5] SMS alerts");

    // Re-sync the SIM800L before SMS (may have lost sync after LoRa TX)
    if (!gsmSync()) {
        Serial.println("[COMM] GSM sync failed — attempting recovery");
        gsmRecover();
    }

    buildSMSMessage();
    const char* contacts[MAX_CONTACTS] = { CONTACT_1, CONTACT_2, CONTACT_3 };
    for (int i = 0; i < MAX_CONTACTS; i++) {
        if (getEmergencyState() == STATE_RESOLVED) return;
        gsmSendSMS(contacts[i], smsMsgBuf);
        vTaskDelay(pdMS_TO_TICKS(1000));   // Longer pause between SMS
    }

    // ---- 3. GPRS live tracking ----
    if (getEmergencyState() == STATE_RESOLVED) return;
    Serial.println("[COMM] [4/5] GPRS connection");
    if (gsmConnectGPRS()) {
        gprsReady = true;
        buildHTTPBody();
        gsmHttpPost(BACKEND_URL, httpBodyBuf);
        lastGPRSUpload = millis();
    }

    // ---- 4. Voice call (last — blocks GSM) ----
    if (getEmergencyState() == STATE_RESOLVED) return;
    Serial.println("[COMM] [5/5] Voice call");
    if (!callMade) {
        // Must disconnect GPRS before voice call
        if (gprsReady) {
            gsmDisconnectGPRS();
            gprsReady = false;
        }

        gsmMakeCall(EMERGENCY_CALL_NUM);
        vTaskDelay(pdMS_TO_TICKS(VOICE_CALL_DURATION_MS));
        gsmHangUp();
        callMade = true;

        // Reconnect GPRS for continuous tracking
        if (gsmConnectGPRS()) {
            gprsReady = true;
            lastGPRSUpload = millis();
        }
    }

    initialAlertsSent = true;
    Serial.println("[COMM] ═══ INITIAL ALERTS COMPLETE ═══");
}

// ============================================================
//  Continuous tracking loop
// ============================================================

static void continuousTracking() {
    unsigned long now = millis();

    // LoRa broadcast every 5 s
    if (now - lastLoRaBroadcast >= LORA_BROADCAST_INTERVAL) {
        LoRaPacket pkt = buildEmergencyPacket();
        sendLoRaPacket(pkt);
        lastLoRaBroadcast = now;
    }

    // BLE re-notification every 3 s (catches missed notifications on the web app)
    if (now - lastBLENotify >= BLE_RENOTIFY_INTERVAL) {
        lockState();
        EmergencyType etype = g_state.emergencyType;
        float lat = g_state.gps.latitude;
        float lon = g_state.gps.longitude;
        unlockState();

        char bleMsg[64];
        if (etype == EMERGENCY_FALL) {
            snprintf(bleMsg, sizeof(bleMsg), "FALL|%.4f|%.4f", lat, lon);
        } else {
            snprintf(bleMsg, sizeof(bleMsg), "SOS|%.4f|%.4f", lat, lon);
        }
        notifyBLEAlert(bleMsg);
        lastBLENotify = now;

        // After a brief pause, reset to IDLE so the polling fallback can detect the next one
        vTaskDelay(pdMS_TO_TICKS(200));
        notifyBLEAlert("IDLE");
    }

    // GPRS upload every 4 s
    if (now - lastGPRSUpload >= GPRS_UPLOAD_INTERVAL) {
        if (gprsReady) {
            buildHTTPBody();
            int result = gsmHttpPost(BACKEND_URL, httpBodyBuf);
            if (result < 0) {
                Serial.println("[COMM] GPRS upload failed — will recover");
                gprsReady = false;
            }
        }
        lastGPRSUpload = now;
    }

    // GSM recovery every 30 s (if GPRS is down)
    if (!gprsReady && now - lastRecoveryCheck >= GSM_RECOVERY_INTERVAL) {
        lastRecoveryCheck = now;
        if (gsmRecover()) {
            gprsReady = true;
            Serial.println("[COMM] GSM recovered ✓");
        }
    }
}

// ============================================================
//  Cleanup (called when emergency is resolved)
// ============================================================

static void resetCommunication() {
    Serial.println("[COMM] Cleaning up...");

    // Send a "resolved" status to the backend
    if (gsmIsReady() && gprsReady) {
        lockState();
        const char* devId = g_state.deviceIdStr;
        unlockState();

        char resolvedBody[HTTP_BODY_SIZE];
        snprintf(resolvedBody, sizeof(resolvedBody),
                 "{\"status\":\"IDLE\",\"deviceID\":\"%s\",\"timestamp\":%lu}",
                 devId, (unsigned long)(millis()));
        gsmHttpPost(BACKEND_URL, resolvedBody);
    }

    // Mark SOS as resolved in Firebase RTDB
    if (gsmIsReady()) {
        sendFirebaseSOSResolved();
    }
    
    // Notify Web App to resolve the alert
    notifyBLEAlert("RESOLVED");

    // Tear down GPRS
    if (gprsReady) {
        gsmDisconnectGPRS();
    }

    // Reset flags
    initialAlertsSent  = false;
    gprsReady          = false;
    callMade           = false;
    lastLoRaBroadcast  = 0;
    lastGPRSUpload     = 0;
    lastRecoveryCheck  = 0;
    lastBLENotify      = 0;

    Serial.println("[COMM] Reset complete");
}

// ============================================================
//  Public API
// ============================================================

void initCommunication() {
    initialAlertsSent  = false;
    gprsReady          = false;
    callMade           = false;
    Serial.println("[COMM] Communication manager initialized");
}

// ============================================================
//  FreeRTOS Task
// ============================================================

void taskCommunication(void* param) {
    (void)param;

    for (;;) {
        EmergencyState state = getEmergencyState();

        switch (state) {

            case STATE_TRANSMITTING:
                if (!initialAlertsSent) {
                    sendInitialAlerts();
                }
                continuousTracking();
                break;

            case STATE_RESOLVED:
                if (initialAlertsSent) {
                    resetCommunication();
                }
                break;

            default:
                // BOOT, READY, COUNTDOWN, ACTIVE — idle
                // (ACTIVE is a brief transitional state)
                break;
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
