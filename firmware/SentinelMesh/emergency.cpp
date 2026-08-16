/*
 * Sentinel Mesh — Emergency State Machine
 *
 * Owns all state transitions:
 *
 *   BOOT ──► READY ──► COUNTDOWN ──► ACTIVE ──► TRANSMITTING ──► RESOLVED ──► READY
 *                  │                                                        │
 *                  └──── (SOS button / movement cancel) ◄───────────────────┘
 *
 * Also manages:
 *   • SOS button interrupt (ISR + debounce)
 *   • Green LED (system ready) and Red LED (emergency active)
 *
 * This task does NOT call any communication functions.
 * Communication is handled entirely by the Communication Manager task.
 */

#include "emergency.h"

// ============================================================
//  SOS Button ISR
// ============================================================

// Volatile flag set by the ISR, consumed by the emergency task.
// Using a dedicated flag separate from g_state.sosButtonPressed
// for the ISR, then copying it over, keeps the ISR minimal.

static volatile bool    s_buttonISRFlag  = false;
static volatile unsigned long s_lastISRTime = 0;

void IRAM_ATTR sosButtonISR() {
    unsigned long now = millis();
    if (now - s_lastISRTime > BUTTON_DEBOUNCE_MS) {
        s_buttonISRFlag = true;
        s_lastISRTime   = now;
    }
}

// ============================================================
//  LED helpers (non-blocking blink)
// ============================================================

static unsigned long ledBlinkTimer  = 0;
static bool          ledBlinkState  = false;

static void setLEDs_Ready() {
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED,   LOW);
}

static void setLEDs_Off() {
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED,   LOW);
}

static void blinkRedLED(unsigned long interval) {
    unsigned long now = millis();
    if (now - ledBlinkTimer >= interval) {
        ledBlinkTimer = now;
        ledBlinkState = !ledBlinkState;
        digitalWrite(PIN_LED_RED, ledBlinkState ? HIGH : LOW);
    }
}

// ============================================================
//  Public API
// ============================================================

void initEmergency() {
    // Configure pins
    pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
    pinMode(PIN_LED_GREEN,  OUTPUT);
    pinMode(PIN_LED_RED,    OUTPUT);

    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED,   LOW);

    // Attach interrupt — FALLING edge (button pulls pin LOW)
    attachInterrupt(digitalPinToInterrupt(PIN_SOS_BUTTON),
                    sosButtonISR, FALLING);

    Serial.println("[EMG] Emergency module initialized (SOS on GPIO27)");
}

// ============================================================
//  FreeRTOS Task — highest priority on Core 0
// ============================================================

void taskEmergency(void* param) {
    (void)param;

    // Give other modules time to initialise
    vTaskDelay(pdMS_TO_TICKS(2000));

    // Transition from BOOT → READY
    lockState();
    g_state.emergencyState = STATE_READY;
    unlockState();

    setLEDs_Ready();
    Serial.println("[EMG] ══════════════════════════");
    Serial.println("[EMG]  System READY — monitoring");
    Serial.println("[EMG] ══════════════════════════");

    for (;;) {

        // ---- Transfer ISR flag to shared state ----
        if (s_buttonISRFlag) {
            s_buttonISRFlag = false;
            g_state.sosButtonPressed = true;
        }

        EmergencyState state = getEmergencyState();

        switch (state) {

        // ────────────────────────────────────────────
        case STATE_READY:
        {
            setLEDs_Ready();

            // Manual SOS — immediate emergency
            if (g_state.sosButtonPressed) {
                g_state.sosButtonPressed = false;

                lockState();
                g_state.emergencyType      = EMERGENCY_MANUAL;
                g_state.emergencyStartTime = millis();
                g_state.emergencyState     = STATE_ACTIVE;
                unlockState();

                Serial.println("[EMG] ▶ SOS BUTTON → ACTIVE");
            }

            // Fall detected — enter countdown
            if (g_state.fallDetected) {
                lockState();
                g_state.emergencyType       = EMERGENCY_FALL;
                g_state.countdownStartTime  = millis();
                g_state.emergencyState      = STATE_COUNTDOWN;
                unlockState();

                ledBlinkTimer = millis();
                Serial.println("[EMG] ▶ FALL DETECTED → COUNTDOWN (15 s)");
            }
            break;
        }

        // ────────────────────────────────────────────
        case STATE_COUNTDOWN:
        {
            // Slow red blink during countdown
            digitalWrite(PIN_LED_GREEN, LOW);
            blinkRedLED(LED_BLINK_SLOW_MS);

            unsigned long elapsed = millis() - g_state.countdownStartTime;

            // Log countdown every second
            static unsigned long lastCountdownLog = 0;
            if (millis() - lastCountdownLog >= 1000) {
                lastCountdownLog = millis();
                unsigned long remaining = (FALL_COUNTDOWN_MS > elapsed)
                                        ? (FALL_COUNTDOWN_MS - elapsed) / 1000
                                        : 0;
                Serial.printf("[EMG] Countdown: %lu s remaining\n", remaining);
            }

            // Movement cancels countdown (MPU clears fallDetected)
            if (!g_state.fallDetected) {
                lockState();
                g_state.emergencyType  = EMERGENCY_NONE;
                g_state.emergencyState = STATE_READY;
                unlockState();
                Serial.println("[EMG] ✖ Countdown CANCELLED (movement)");
            }

            // SOS button also cancels countdown
            else if (g_state.sosButtonPressed) {
                g_state.sosButtonPressed = false;

                lockState();
                g_state.fallDetected   = false;
                g_state.emergencyType  = EMERGENCY_NONE;
                g_state.emergencyState = STATE_READY;
                unlockState();
                Serial.println("[EMG] ✖ Countdown CANCELLED (button)");
            }

            // Countdown expired → confirm emergency
            else if (elapsed >= FALL_COUNTDOWN_MS) {
                lockState();
                g_state.emergencyStartTime = millis();
                g_state.emergencyState     = STATE_ACTIVE;
                unlockState();
                Serial.println("[EMG] ▶ Countdown EXPIRED → ACTIVE");
            }
            break;
        }

        // ────────────────────────────────────────────
        case STATE_ACTIVE:
        {
            // Brief transitional state — move to TRANSMITTING immediately
            lockState();
            g_state.emergencyState = STATE_TRANSMITTING;
            unlockState();

            ledBlinkTimer = millis();
            Serial.println("[EMG] ▶ ACTIVE → TRANSMITTING");
            break;
        }

        // ────────────────────────────────────────────
        case STATE_TRANSMITTING:
        {
            // Fast red blink during active transmission
            digitalWrite(PIN_LED_GREEN, LOW);
            blinkRedLED(LED_BLINK_FAST_MS);

            // SOS button stops the emergency
            if (g_state.sosButtonPressed) {
                g_state.sosButtonPressed = false;

                lockState();
                g_state.emergencyState = STATE_RESOLVED;
                unlockState();
                Serial.println("[EMG] ■ SOS BUTTON → RESOLVED");
            }
            break;
        }

        // ────────────────────────────────────────────
        case STATE_RESOLVED:
        {
            setLEDs_Off();

            lockState();
            g_state.emergencyType = EMERGENCY_NONE;
            g_state.fallDetected  = false;
            unlockState();

            Serial.println("[EMG] Cleaning up...");
            vTaskDelay(pdMS_TO_TICKS(RESOLVED_CLEANUP_MS));

            lockState();
            g_state.emergencyState = STATE_READY;
            unlockState();

            Serial.println("[EMG] ▶ RESOLVED → READY");
            Serial.println("[EMG] ══════════════════════════");
            Serial.println("[EMG]  System READY — monitoring");
            Serial.println("[EMG] ══════════════════════════");
            break;
        }

        // ────────────────────────────────────────────
        default:
            break;
        }

        vTaskDelay(pdMS_TO_TICKS(50));   // 20 Hz state machine tick
    }
}
