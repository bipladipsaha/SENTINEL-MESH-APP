/*
 * Sentinel Mesh — Shared State
 *
 * Defines the global state structure shared across all FreeRTOS tasks.
 * All access to g_state must go through lockState()/unlockState() when
 * writing, except for volatile atomic reads (emergencyState, sosButtonPressed).
 */

#ifndef STATE_H
#define STATE_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

// ============================================================
//  ENUMERATIONS
// ============================================================

/*
 * Emergency State Machine:
 *
 *   BOOT ──► READY ──► COUNTDOWN ──► ACTIVE ──► TRANSMITTING ──► RESOLVED
 *              ▲          │                                          │
 *              │          │ (cancel)                                 │
 *              │          ▼                                          │
 *              └──────── READY ◄─────────────────────────────────────┘
 *
 *   BOOT:         System initializing
 *   READY:        All systems go, monitoring for emergencies
 *   COUNTDOWN:    Fall detected, 15s countdown (victim can cancel)
 *   ACTIVE:       Emergency confirmed, preparing communication
 *   TRANSMITTING: Actively broadcasting alerts and tracking
 *   RESOLVED:     Emergency ended, cleaning up
 */
enum EmergencyState : uint8_t {
    STATE_BOOT = 0,
    STATE_READY,
    STATE_COUNTDOWN,
    STATE_ACTIVE,
    STATE_TRANSMITTING,
    STATE_RESOLVED
};

enum EmergencyType : uint8_t {
    EMERGENCY_NONE = 0,
    EMERGENCY_MANUAL,     // SOS button pressed
    EMERGENCY_FALL        // Fall detection triggered
};

// ============================================================
//  DATA STRUCTURES
// ============================================================

struct GPSData {
    float    latitude;
    float    longitude;
    bool     valid;
    uint32_t fixTimestamp;   // millis() when last valid fix received
};

struct BatteryData {
    float    voltage;
    uint8_t  percent;
    bool     lowBattery;
};

struct SentinelState {
    // ---- Emergency ----
    volatile EmergencyState  emergencyState;
    EmergencyType            emergencyType;
    uint32_t                 emergencyStartTime;   // millis() at ACTIVE
    uint32_t                 countdownStartTime;    // millis() at COUNTDOWN

    // ---- GPS ----
    GPSData gps;

    // ---- Battery ----
    BatteryData battery;

    // ---- Module Ready Flags ----
    bool gpsReady;
    bool loraReady;
    bool gsmReady;
    bool mpuReady;

    // ---- Trigger Flags ----
    volatile bool sosButtonPressed;   // Set by ISR, cleared by emergency task
    volatile bool fallDetected;       // Set by MPU task, cleared by emergency task
};

// ============================================================
//  GLOBAL DECLARATIONS (defined in SentinelMesh.ino)
// ============================================================

extern SentinelState      g_state;
extern SemaphoreHandle_t  g_stateMutex;

// ============================================================
//  THREAD-SAFE HELPERS
// ============================================================

inline void lockState() {
    xSemaphoreTake(g_stateMutex, portMAX_DELAY);
}

inline void unlockState() {
    xSemaphoreGive(g_stateMutex);
}

// Atomic read of emergency state (single byte, volatile — safe without mutex)
inline EmergencyState getEmergencyState() {
    return g_state.emergencyState;
}

// Human-readable state name for debug logging
inline const char* stateName(EmergencyState s) {
    switch (s) {
        case STATE_BOOT:         return "BOOT";
        case STATE_READY:        return "READY";
        case STATE_COUNTDOWN:    return "COUNTDOWN";
        case STATE_ACTIVE:       return "ACTIVE";
        case STATE_TRANSMITTING: return "TRANSMITTING";
        case STATE_RESOLVED:     return "RESOLVED";
        default:                 return "UNKNOWN";
    }
}

inline const char* emergencyTypeName(EmergencyType t) {
    switch (t) {
        case EMERGENCY_NONE:   return "NONE";
        case EMERGENCY_MANUAL: return "MANUAL";
        case EMERGENCY_FALL:   return "FALL";
        default:               return "UNKNOWN";
    }
}

#endif // STATE_H
