/*
 * Sentinel Mesh — GPS Module
 *
 * Continuously reads NMEA sentences from the NEO-6M on UART2
 * and updates the global GPS struct with the latest fix.
 */

#include "gps.h"
#include <TinyGPS++.h>
#include <HardwareSerial.h>

static TinyGPSPlus   gpsParser;
static HardwareSerial gpsSerial(2);   // UART2

// ---- Initialization ----

void initGPS() {
    gpsSerial.begin(GPS_BAUD, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
    Serial.println("[GPS] Initialized on UART2 (GPIO16/17)");
}

// ---- FreeRTOS Task ----

void taskGPS(void* param) {
    (void)param;

    bool firstFix = false;

    for (;;) {
        // Feed all available bytes to the parser
        while (gpsSerial.available() > 0) {
            gpsParser.encode(gpsSerial.read());
        }

        // Update shared state when we get a valid location
        if (gpsParser.location.isUpdated() && gpsParser.location.isValid()) {
            float lat = gpsParser.location.lat();
            float lng = gpsParser.location.lng();

            lockState();
            g_state.gps.latitude     = lat;
            g_state.gps.longitude    = lng;
            g_state.gps.valid        = true;
            g_state.gps.fixTimestamp = millis();
            unlockState();

            if (!firstFix) {
                firstFix = true;

                lockState();
                g_state.gpsReady = true;
                unlockState();

                Serial.printf("[GPS] First fix: %.6f, %.6f\n", lat, lng);
            }
        }

        // Mark GPS as stale if no update in 10 seconds
        lockState();
        if (g_state.gps.valid && (millis() - g_state.gps.fixTimestamp > 10000)) {
            g_state.gps.valid = false;
            Serial.println("[GPS] Fix lost (stale)");
        }
        unlockState();

        vTaskDelay(pdMS_TO_TICKS(GPS_READ_INTERVAL));
    }
}
