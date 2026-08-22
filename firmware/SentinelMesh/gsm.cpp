/*
 * Sentinel Mesh — GSM Module (SIM800L)
 *
 * Low-level driver for the SIM800L over UART1 (HardwareSerial).
 * Provides AT-command primitives consumed by the Communication Manager.
 *
 * All buffers are static — zero dynamic allocation.
 *
 * SIM800L is powered directly from the Li-ion battery (3.7–4.2 V)
 * with a common ground shared with the ESP32.
 */

#include "gsm.h"
#include <HardwareSerial.h>

static HardwareSerial gsmSerial(1);   // UART1

// ---- Static buffers ----
static char atResponse[AT_BUFFER_SIZE];
static char cmdBuf[CMD_BUFFER_SIZE];
static bool gprsConnected = false;

// ============================================================
//  Core AT helpers
// ============================================================

/*
 * Wait for a specific substring in the serial stream.
 * Does NOT send anything — just listens.
 */
static bool waitForResponse(const char* expected, unsigned long timeout) {
    unsigned long start = millis();
    int idx = 0;
    memset(atResponse, 0, sizeof(atResponse));

    while (millis() - start < timeout) {
        while (gsmSerial.available()) {
            char c = gsmSerial.read();
            if (idx < AT_BUFFER_SIZE - 1) {
                atResponse[idx++] = c;
            }
            // Early exit on match
            if (expected && strstr(atResponse, expected)) return true;
            if (strstr(atResponse, "ERROR"))              return false;
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }

    // Final check after timeout
    return (expected && strstr(atResponse, expected));
}

/*
 * Send an AT command and wait for an expected response.
 * Returns true if `expected` appears within `timeout` ms.
 */
static bool sendAT(const char* cmd, const char* expected,
                    unsigned long timeout) {
    // Drain stale data
    while (gsmSerial.available()) gsmSerial.read();

    gsmSerial.println(cmd);
    return waitForResponse(expected, timeout);
}

/* Convenience: send and expect "OK". */
static bool sendATOK(const char* cmd,
                      unsigned long timeout = AT_TIMEOUT) {
    return sendAT(cmd, "OK", timeout);
}

/*
 * Wake up / re-sync the SIM800L.
 * Sends multiple AT commands with pauses to bring the module
 * out of sleep or recover from a bad state.
 */
bool gsmSync() {
    // Drain any garbage in the serial buffer
    while (gsmSerial.available()) gsmSerial.read();

    for (int i = 0; i < 3; i++) {
        gsmSerial.println("AT");
        vTaskDelay(pdMS_TO_TICKS(300));
        while (gsmSerial.available()) gsmSerial.read();
    }
    vTaskDelay(pdMS_TO_TICKS(500));

    // Final sync — check if module answers
    bool ok = sendATOK("AT", 2000);
    if (ok) {
        sendATOK("ATE0", 1000);  // Re-disable echo
    }
    return ok;
}

// ============================================================
//  Initialization
// ============================================================

void initGSM() {
    gsmSerial.begin(GSM_BAUD, SERIAL_8N1, PIN_SIM_RX, PIN_SIM_TX);

    Serial.println("[GSM] Waiting for SIM800L boot...");
    vTaskDelay(pdMS_TO_TICKS(3000));   // SIM800L needs ~3 s after power-on

    // Auto-baud synchronisation
    sendATOK("AT", 1000);
    sendATOK("AT", 1000);

    // Disable echo
    sendATOK("ATE0");

    // Check SIM card
    if (!sendAT("AT+CPIN?", "READY", AT_TIMEOUT)) {
        Serial.println("[GSM] SIM card not ready!");
        return;
    }
    Serial.println("[GSM] SIM card OK");

    // Text-mode SMS
    sendATOK("AT+CMGF=1");

    // Set character set to GSM for reliable SMS
    sendATOK("AT+CSCS=\"GSM\"");

    // Wait for network registration (up to 60 s)
    bool registered = false;
    for (int attempt = 0; attempt < 30; attempt++) {
        if (gsmCheckNetwork()) { registered = true; break; }
        Serial.printf("[GSM] Waiting for network… (%d/30)\n", attempt + 1);
        vTaskDelay(pdMS_TO_TICKS(2000));
    }

    if (registered) {
        lockState();
        g_state.gsmReady = true;
        unlockState();
        Serial.println("[GSM] Network registered ✓");
    } else {
        Serial.println("[GSM] Network registration failed (will retry later)");
    }
}

// ============================================================
//  Status
// ============================================================

bool gsmIsReady() {
    return g_state.gsmReady;
}

bool gsmCheckNetwork() {
    if (!sendAT("AT+CREG?", "+CREG:", AT_TIMEOUT)) return false;

    // Response: +CREG: 0,<stat>
    // stat 1 = registered (home), 5 = registered (roaming)
    char* p = strstr(atResponse, "+CREG:");
    if (!p) return false;

    char* comma = strchr(p, ',');
    if (!comma) return false;

    int stat = atoi(comma + 1);
    return (stat == 1 || stat == 5);
}

// ============================================================
//  SMS
// ============================================================

bool gsmSendSMS(const char* number, const char* message) {
    if (!number || !message) return false;

    // Try to set text mode with retries + re-sync
    bool textModeOk = false;
    for (int attempt = 0; attempt < 3; attempt++) {
        if (sendATOK("AT+CMGF=1", AT_TIMEOUT)) {
            textModeOk = true;
            break;
        }
        Serial.printf("[GSM] SMS: text mode failed (attempt %d/3), re-syncing...\n", attempt + 1);
        gsmSync();  // Wake up the module
        sendATOK("AT+CMGF=1", AT_TIMEOUT);  // Re-apply text mode
        sendATOK("AT+CSCS=\"GSM\"", AT_TIMEOUT);  // Re-apply charset
        vTaskDelay(pdMS_TO_TICKS(500));
    }

    if (!textModeOk) {
        // Last resort: one more sync + try
        gsmSync();
        textModeOk = sendATOK("AT+CMGF=1", AT_LONG_TIMEOUT);
    }

    if (!textModeOk) {
        Serial.printf("[GSM] SMS: Failed to set text mode after retries. Response: '%s'\n", atResponse);
        return false;
    }

    Serial.printf("[GSM] SMS → %s\n", number);

    snprintf(cmdBuf, sizeof(cmdBuf), "AT+CMGS=\"%s\"", number);

    // Drain buffer and send command
    vTaskDelay(pdMS_TO_TICKS(100));
    while (gsmSerial.available()) gsmSerial.read();
    gsmSerial.println(cmdBuf);

    // Wait for the '>' prompt
    unsigned long start = millis();
    bool gotPrompt = false;
    char debugBuf[64] = {0};
    int dbgIdx = 0;

    while (millis() - start < AT_TIMEOUT) {
        while (gsmSerial.available()) {
            char c = gsmSerial.read();
            if (dbgIdx < (int)sizeof(debugBuf) - 1 && c >= 32 && c <= 126) {
                debugBuf[dbgIdx++] = c;
            }
            if (c == '>') { gotPrompt = true; break; }
        }
        if (gotPrompt) break;
        vTaskDelay(pdMS_TO_TICKS(10));
    }

    if (!gotPrompt) {
        Serial.printf("[GSM] SMS: no '>' prompt. Rcvd: '%s'\n", debugBuf);
        gsmSerial.write(0x1B);   // ESC to cancel
        return false;
    }

    // Send message body followed by Ctrl+Z
    gsmSerial.print(message);
    gsmSerial.write(0x1A);

    // Wait for +CMGS confirmation (up to 10 s)
    bool ok = waitForResponse("+CMGS", AT_LONG_TIMEOUT);
    Serial.printf("[GSM] SMS %s\n", ok ? "sent ✓" : "FAILED");
    return ok;
}

// ============================================================
//  Voice Call
// ============================================================

bool gsmMakeCall(const char* number) {
    Serial.printf("[GSM] Calling %s\n", number);
    snprintf(cmdBuf, sizeof(cmdBuf), "ATD%s;", number);
    return sendATOK(cmdBuf, AT_LONG_TIMEOUT);
}

bool gsmHangUp() {
    Serial.println("[GSM] Hanging up");
    return sendATOK("ATH");
}

// ============================================================
//  GPRS / HTTP
// ============================================================

bool gsmConnectGPRS() {
    Serial.println("[GSM] Connecting LTE Data...");

    // Tear down any previous session
    sendATOK("AT+HTTPTERM",   2000);

    // Set APN for LTE
    snprintf(cmdBuf, sizeof(cmdBuf),
             "AT+CGDCONT=1,\"IP\",\"%s\"", GSM_APN);
    if (!sendATOK(cmdBuf)) return false;

    // Activate PDP Context
    // We don't fail if this returns error, as it might already be active
    sendATOK("AT+CGACT=1,1", AT_LONG_TIMEOUT);

    gprsConnected = true;
    Serial.println("[GSM] LTE Data connected ✓");
    return true;
}

int gsmHttpPost(const char* url, const char* body) {
    if (!gprsConnected) return -1;

    // Set URL
    snprintf(cmdBuf, sizeof(cmdBuf),
             "AT+HTTPPARA=\"URL\",\"%s\"", url);
    if (!sendATOK(cmdBuf)) return -2;

    // Content type
    if (!sendATOK("AT+HTTPPARA=\"CONTENT\",\"application/json\"")) return -3;

    // Announce body length
    int bodyLen = strlen(body);
    snprintf(cmdBuf, sizeof(cmdBuf), "AT+HTTPDATA=%d,10000", bodyLen);
    if (!sendAT(cmdBuf, "DOWNLOAD", AT_TIMEOUT)) return -4;

    // Send the JSON body
    gsmSerial.print(body);

    // Wait for SIM800L to acknowledge the data
    if (!waitForResponse("OK", AT_TIMEOUT)) return -4;

    // Execute HTTP POST
    if (!sendAT("AT+HTTPACTION=1", "+HTTPACTION:", AT_LONG_TIMEOUT)) return -5;

    // Parse status code from: +HTTPACTION: 1,<status>,<datalen>
    char* p = strstr(atResponse, "+HTTPACTION:");
    if (!p) return -6;

    char* comma = strchr(p, ',');
    if (!comma) return -7;

    int httpStatus = atoi(comma + 1);
    Serial.printf("[GSM] HTTP POST → %d\n", httpStatus);
    return httpStatus;
}

/*
 * HTTPS PUT — used for Firebase Realtime Database writes.
 *
 * This is a self-contained HTTPS PUT:
 *   1. Tears down any existing HTTP session
 *   2. Opens bearer + HTTP with SSL enabled
 *   3. Sends PUT (HTTPACTION=3 is undocumented on SIM800L,
 *      so we use the AT+HTTPPARA="URL" trick with .json?_method=PUT
 *      and POST action=1, which Firebase REST API accepts)
 *   4. Tears down the session afterward
 *
 * Returns HTTP status code, or negative on error.
 */
int gsmHttpsPut(const char* url, const char* body) {
    // Tear down any prior session
    sendATOK("AT+HTTPTERM",  2000);

    // Set APN for LTE
    snprintf(cmdBuf, sizeof(cmdBuf), "AT+CGDCONT=1,\"IP\",\"%s\"", GSM_APN);
    sendATOK(cmdBuf, 2000);

    // Ensure LTE data context is active before initializing HTTP
    sendATOK("AT+CGACT=1,1", 5000);

    // Init HTTP
    if (!sendATOK("AT+HTTPINIT", AT_TIMEOUT)) return -1;
    // A7670C automatically handles SSL when URL starts with https://
    // No need for AT+HTTPSSL=1 or CID param.

    // Set URL
    snprintf(cmdBuf, sizeof(cmdBuf),
             "AT+HTTPPARA=\"URL\",\"%s\"", url);
    if (!sendATOK(cmdBuf, AT_LONG_TIMEOUT))    return -4;

    // Content type
    if (!sendATOK("AT+HTTPPARA=\"CONTENT\",\"application/json\"")) return -5;

    // Announce body length
    int bodyLen = strlen(body);
    snprintf(cmdBuf, sizeof(cmdBuf), "AT+HTTPDATA=%d,10000", bodyLen);
    if (!sendAT(cmdBuf, "DOWNLOAD", AT_TIMEOUT)) return -6;

    // Send the JSON body
    gsmSerial.print(body);
    if (!waitForResponse("OK", AT_TIMEOUT)) return -7;

    // Execute HTTP POST (Firebase REST API treats POST to .json as PUT/PATCH
    // when the full path is specified; we use method override in the URL)
    if (!sendAT("AT+HTTPACTION=1", "+HTTPACTION:", AT_LONG_TIMEOUT)) return -8;

    // Parse status code from: +HTTPACTION: 1,<status>,<datalen>
    char* p = strstr(atResponse, "+HTTPACTION:");
    if (!p) return -9;

    char* comma = strchr(p, ',');
    if (!comma) return -10;

    int httpStatus = atoi(comma + 1);

    // Clean up HTTP session (leave bearer open for possible reuse)
    sendATOK("AT+HTTPTERM", 2000);

    Serial.printf("[GSM] HTTPS PUT → %d\n", httpStatus);
    return httpStatus;
}

bool gsmDisconnectGPRS() {
    Serial.println("[GSM] Disconnecting LTE Data");
    sendATOK("AT+HTTPTERM",   2000);
    sendATOK("AT+CGACT=0,1",  2000);
    gprsConnected = false;
    return true;
}

/*
 * HTTPS POST — used for Vercel serverless backend.
 *
 * Self-contained: tears down existing session, opens a new one
 * with SSL, sends POST, and cleans up.
 * Returns HTTP status code, or negative on error.
 */
int gsmHttpsPost(const char* url, const char* body) {
    // Tear down any prior session
    sendATOK("AT+HTTPTERM",  2000);

    // Set APN for LTE
    snprintf(cmdBuf, sizeof(cmdBuf), "AT+CGDCONT=1,\"IP\",\"%s\"", GSM_APN);
    sendATOK(cmdBuf, 2000);

    // Ensure LTE data context is active before initializing HTTP
    sendATOK("AT+CGACT=1,1", 5000);

    // Init HTTP
    if (!sendATOK("AT+HTTPINIT", AT_TIMEOUT)) return -1;
    // A7670C handles SSL automatically for https URLs

    // Set URL
    snprintf(cmdBuf, sizeof(cmdBuf),
             "AT+HTTPPARA=\"URL\",\"%s\"", url);
    if (!sendATOK(cmdBuf, AT_LONG_TIMEOUT))    return -4;

    // Content type
    if (!sendATOK("AT+HTTPPARA=\"CONTENT\",\"application/json\"")) return -5;

    // Announce body length
    int bodyLen = strlen(body);
    snprintf(cmdBuf, sizeof(cmdBuf), "AT+HTTPDATA=%d,10000", bodyLen);
    if (!sendAT(cmdBuf, "DOWNLOAD", AT_TIMEOUT)) return -6;

    // Send the JSON body
    gsmSerial.print(body);
    if (!waitForResponse("OK", AT_TIMEOUT)) return -7;

    // Execute HTTP POST (action 1)
    if (!sendAT("AT+HTTPACTION=1", "+HTTPACTION:", AT_LONG_TIMEOUT)) return -8;

    // Parse status code from: +HTTPACTION: 1,<status>,<datalen>
    char* p = strstr(atResponse, "+HTTPACTION:");
    if (!p) return -9;

    char* comma = strchr(p, ',');
    if (!comma) return -10;

    int httpStatus = atoi(comma + 1);

    // Clean up HTTP session (leave bearer open for possible reuse)
    sendATOK("AT+HTTPTERM", 2000);

    Serial.printf("[GSM] HTTPS POST → %d\n", httpStatus);
    return httpStatus;
}

// ============================================================
//  Recovery
// ============================================================

bool gsmRecover() {
    Serial.println("[GSM] Attempting recovery...");

    // Basic AT check
    if (!sendATOK("AT", 1000)) {
        Serial.println("[GSM] Module not responding");
        lockState();
        g_state.gsmReady = false;
        unlockState();
        return false;
    }

    // Module is responding. Re-apply essential settings in case of a reboot
    sendATOK("ATE0");
    sendATOK("AT+CMGF=1");
    sendATOK("AT+CSCS=\"GSM\"");

    // Network check (retry up to 10×)
    bool netOk = false;
    for (int i = 0; i < 10; i++) {
        if (gsmCheckNetwork()) { netOk = true; break; }
        vTaskDelay(pdMS_TO_TICKS(3000));
    }

    if (!netOk) {
        Serial.println("[GSM] Network still unavailable");
        lockState();
        g_state.gsmReady = false;
        unlockState();
        return false;
    }

    lockState();
    g_state.gsmReady = true;
    unlockState();

    // Re-establish GPRS
    gprsConnected = false;
    if (!gsmConnectGPRS()) {
        Serial.println("[GSM] GPRS reconnect failed");
        return false;
    }

    Serial.println("[GSM] Recovery successful ✓");
    return true;
}
