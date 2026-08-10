#include "firebase_alert.h"
#include "gsm.h"
#include <Arduino.h>

static char fbBodyBuf[FIREBASE_BODY_SIZE];
static char pathBuf[64];

void initFirebaseAlert() {
    Serial.println("[FIREBASE] Initialized");
}

void sendFirebaseSOSAlert() {
    Serial.println("[VERCEL] Sending SOS Alert to Backend...");
    
    lockState();
    float lat = g_state.gps.latitude;
    float lon = g_state.gps.longitude;
    uint8_t bat = g_state.battery.percent;
    EmergencyType etype = g_state.emergencyType;
    unlockState();

    const char* typeStr = (etype == EMERGENCY_FALL) ? "FALL" : "BUTTON";

    // Build JSON payload (including the secret for authentication)
    snprintf(fbBodyBuf, sizeof(fbBodyBuf),
             "{\"deviceId\":%d,\"lat\":%.6f,\"lon\":%.6f,\"type\":\"%s\",\"battery\":%d,\"timestamp\":%lu,\"active\":true,\"secret\":\"%s\"}",
             DEVICE_ID, lat, lon, typeStr, bat, (unsigned long)millis(), VERCEL_SECRET);

    // Ensure GPRS is connected
    bool disconnectAfter = false;
    // gsmConnectGPRS will tear down any previous session and start a new one. 
    // To be non-blocking, we'll just attempt it here and leave it connected for the next step.
    if (!gsmConnectGPRS()) {
        Serial.println("[VERCEL] Failed to connect GPRS for alert.");
        return;
    }

    // Send POST request to Vercel Serverless Function
    int result = gsmHttpsPost(VERCEL_URL, fbBodyBuf);
    
    if (result == 200) {
        Serial.println("[VERCEL] SOS Alert successfully sent to nearby users!");
    } else {
        Serial.printf("[VERCEL] Failed to send alert. HTTP Status: %d\n", result);
    }
}
