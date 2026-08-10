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
    Serial.printf("[GSM] SMS → %s\n", number);

    snprintf(cmdBuf, sizeof(cmdBuf), "AT+CMGS=\"%s\"", number);

    // Drain buffer and send command
    while (gsmSerial.available()) gsmSerial.read();
    gsmSerial.println(cmdBuf);

    // Wait for the '>' prompt
    unsigned long start = millis();
    bool gotPrompt = false;
    while (millis() - start < AT_TIMEOUT) {
        if (gsmSerial.available()) {
            if (gsmSerial.read() == '>') { gotPrompt = true; break; }
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }

    if (!gotPrompt) {
        Serial.println("[GSM] SMS: no '>' prompt");
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
    Serial.println("[GSM] Connecting GPRS...");

    // Tear down any previous session
    sendATOK("AT+HTTPTERM",   2000);
    sendATOK("AT+SAPBR=0,1",  2000);

    // Configure bearer profile 1
    if (!sendATOK("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"")) return false;

    snprintf(cmdBuf, sizeof(cmdBuf),
             "AT+SAPBR=3,1,\"APN\",\"%s\"", GSM_APN);
    if (!sendATOK(cmdBuf)) return false;

    // Open bearer (can take a few seconds)
    if (!sendAT("AT+SAPBR=1,1", "OK", AT_LONG_TIMEOUT)) {
        Serial.println("[GSM] Bearer open failed");
        return false;
    }

    // Initialise HTTP service
    if (!sendATOK("AT+HTTPINIT")) return false;
    if (!sendATOK("AT+HTTPPARA=\"CID\",1")) return false;

    gprsConnected = true;
    Serial.println("[GSM] GPRS connected ✓");
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

    // Execute HTTP PUT (Firebase REST API requires PUT to overwrite data)
    if (!sendAT("AT+HTTPACTION=2", "+HTTPACTION:", AT_LONG_TIMEOUT)) return -5;

    // Parse status code from: +HTTPACTION: 1,<status>,<datalen>
    char* p = strstr(atResponse, "+HTTPACTION:");
    if (!p) return -6;

    char* comma = strchr(p, ',');
    if (!comma) return -7;

    int httpStatus = atoi(comma + 1);
    Serial.printf("[GSM] HTTP POST → %d\n", httpStatus);
    return httpStatus;
}

int gsmHttpsPut(const char* host, const char* path, const char* body, const char* auth) {
    if (!gprsConnected) return -1;

    // Enable SSL for HTTPS
    sendATOK("AT+HTTPSSL=1");

    // Set URL with auth
    snprintf(cmdBuf, sizeof(cmdBuf),
             "AT+HTTPPARA=\"URL\",\"https://%s%s?auth=%s\"", host, path, auth);
    if (!sendATOK(cmdBuf)) return -2;

    // Content type
    if (!sendATOK("AT+HTTPPARA=\"CONTENT\",\"application/json\"")) return -3;

    // Announce body length
    int bodyLen = strlen(body);
    snprintf(cmdBuf, sizeof(cmdBuf), "AT+HTTPDATA=%d,10000", bodyLen);
    if (!sendAT(cmdBuf, "DOWNLOAD", AT_TIMEOUT)) return -4;

    // Send the JSON body
    gsmSerial.print(body);
    if (!waitForResponse("OK", AT_TIMEOUT)) return -4;

    // Execute HTTP PUT (action 4) or POST (action 1) depending on what the firmware supports.
    // We use HTTPACTION=4 for PUT.
    if (!sendAT("AT+HTTPACTION=4", "+HTTPACTION:", AT_LONG_TIMEOUT)) return -5;

    char* p = strstr(atResponse, "+HTTPACTION:");
    if (!p) return -6;

    char* comma = strchr(p, ',');
    if (!comma) return -7;

    int httpStatus = atoi(comma + 1);
    Serial.printf("[GSM] HTTPS PUT → %d\n", httpStatus);
    
    // Disable SSL after request
    sendATOK("AT+HTTPSSL=0");
    
    return httpStatus;
}

int gsmHttpsPost(const char* url, const char* body) {
    if (!gprsConnected) return -1;

    // Enable SSL for HTTPS
    sendATOK("AT+HTTPSSL=1");

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
    if (!waitForResponse("OK", AT_TIMEOUT)) return -4;

    // Execute HTTP POST (action 1)
    if (!sendAT("AT+HTTPACTION=1", "+HTTPACTION:", AT_LONG_TIMEOUT)) return -5;

    char* p = strstr(atResponse, "+HTTPACTION:");
    if (!p) return -6;

    char* comma = strchr(p, ',');
    if (!comma) return -7;

    int httpStatus = atoi(comma + 1);
    Serial.printf("[GSM] HTTPS POST → %d\n", httpStatus);
    
    // Disable SSL after request
    sendATOK("AT+HTTPSSL=0");
    
    return httpStatus;
}

bool gsmDisconnectGPRS() {
    Serial.println("[GSM] Disconnecting GPRS");
    sendATOK("AT+HTTPTERM",   2000);
    sendATOK("AT+SAPBR=0,1",  2000);
    gprsConnected = false;
    return true;
}

// ============================================================
//  Sync
// ============================================================

bool gsmSync() {
    // Send AT a couple of times to re-synchronize after LoRa TX
    if (sendATOK("AT", 1000)) return true;
    vTaskDelay(pdMS_TO_TICKS(500));
    return sendATOK("AT", 1000);
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
