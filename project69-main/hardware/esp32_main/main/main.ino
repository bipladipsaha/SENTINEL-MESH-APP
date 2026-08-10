/*
 * ╔══════════════════════════════════════════════════════════╗
 * ║             SENTINEL MESH — The Offline Guardian        ║
 * ║                                                          ║
 * ║  A wearable emergency device that transmits SOS alerts  ║
 * ║  and live GPS tracking without requiring a smartphone.  ║
 * ║                                                          ║
 * ║  Hardware:  ESP32 + NEO-6M + SX1278 + SIM800L + MPU6050 ║
 * ║  Version:   1.0.0                                       ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * FreeRTOS Tasks:
 *
 *   Task             Core  Priority  Stack   Description
 *   ───────────────  ────  ────────  ──────  ─────────────────────────
 *   taskEmergency    0     5 (high)  4096    State machine + LED + SOS
 *   taskMPU          0     2         4096    Fall detection (I2C)
 *   taskBattery      0     1 (low)   2048    Battery ADC reading
 *   taskCommunication 1    3         8192    LoRa + GSM coordination
 *   taskGPS          1     2         4096    GPS parsing (UART2)
 *
 * Memory strategy:
 *   ✓ Fixed-size structs    ✓ Binary LoRa packets
 *   ✓ Static char buffers   ✓ No WiFi / Firebase / ArduinoJson
 */

#include <Wire.h>
#include <SPI.h>
#include <LoRa.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

#include "config.h"
#include "state.h"
#include "battery.h"
#include "gps.h"
#include "mpu.h"
#include "lora_manager.h"
#include "gsm.h"
#include "communication.h"
#include "emergency.h"
#include "firebase_alert.h"

// ============================================================
//  Global shared state (declared extern in state.h)
// ============================================================

SentinelState     g_state;
SemaphoreHandle_t g_stateMutex;

// ============================================================
//  setup()
// ============================================================

void setup() {
    Serial.begin(SERIAL_DEBUG_BAUD);
    delay(500);

    Serial.println();
    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║    SENTINEL MESH v" FIRMWARE_VERSION "             ║");
    Serial.println("║    The Offline Guardian              ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println();

    // ---- Create mutex ----
    g_stateMutex = xSemaphoreCreateMutex();
    if (!g_stateMutex) {
        Serial.println("[MAIN] FATAL: Could not create mutex!");
        while (true) { delay(1000); }
    }

    // ---- Zero-initialise global state ----
    memset(&g_state, 0, sizeof(g_state));
    g_state.emergencyState = STATE_BOOT;

    // ---- Initialise all modules ----
    Serial.println("[MAIN] Initialising modules...");

    initBattery();
    initGPS();
    initMPU();
    initLoRa();
    initEmergency();
    initCommunication();
    initFirebaseAlert();
    initGSM();           // GSM last — it takes the longest (network registration)

    // ---- Print module status ----
    Serial.println();
    Serial.printf("[MAIN] GPS  : %s\n", g_state.gpsReady  ? "OK" : "waiting for fix");
    Serial.printf("[MAIN] MPU  : %s\n", g_state.mpuReady  ? "OK" : "FAIL");
    Serial.printf("[MAIN] LoRa : %s\n", g_state.loraReady ? "OK" : "FAIL");
    Serial.printf("[MAIN] GSM  : %s\n", g_state.gsmReady  ? "OK" : "waiting for network");
    Serial.printf("[MAIN] BAT  : %.2fV (%d%%)\n",
                  g_state.battery.voltage, g_state.battery.percent);
    Serial.println();

    // ---- Create FreeRTOS tasks ----
    Serial.println("[MAIN] Creating tasks...");

    //                       Function            Name   Stack               Param  Prio  Handle  Core
    xTaskCreatePinnedToCore(taskEmergency,       "EMG",  TASK_STACK_EMERGENCY, NULL, 5,    NULL,   0);
    xTaskCreatePinnedToCore(taskMPU,             "MPU",  TASK_STACK_MPU,       NULL, 2,    NULL,   0);
    xTaskCreatePinnedToCore(taskBattery,         "BAT",  TASK_STACK_BATTERY,   NULL, 1,    NULL,   0);
    xTaskCreatePinnedToCore(taskCommunication,   "COMM", TASK_STACK_COMM,      NULL, 3,    NULL,   1);
    xTaskCreatePinnedToCore(taskGPS,             "GPS",  TASK_STACK_GPS,       NULL, 2,    NULL,   1);

    Serial.println("[MAIN] All tasks launched");
    Serial.println("[MAIN] ────────────────────────────────");
    Serial.println("[MAIN] Sentinel Mesh is operational.");
    Serial.println("[MAIN] Press SOS button to trigger emergency.");
    Serial.println("[MAIN] ────────────────────────────────");
    Serial.println();
}

// ============================================================
//  loop()  — intentionally empty; all work is in FreeRTOS tasks
// ============================================================

void loop() {
    // Nothing here.
    // FreeRTOS tasks handle everything concurrently.
    vTaskDelay(pdMS_TO_TICKS(10000));
}
