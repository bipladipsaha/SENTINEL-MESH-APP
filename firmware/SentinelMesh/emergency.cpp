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
//  SOS Button Polling (Software Debounce)
// ============================================================

// We poll the button in the 50ms task loop instead of using an ISR.
// This is much more robust against EMI noise on breadboards/long wires
// which commonly causes false FALLING edge interrupts.
static int s_buttonPressCount = 0;
const int BUTTON_DEBOUNCE_TICKS = 3; // Must be held LOW for 3 consecutive ticks (150ms)

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

    // Note: Interrupt removed; we now poll the button in taskEmergency.
    Serial.println("[EMG] Emergency module initialized (SOS on GPIO27 - Polling)");
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
        // ---- Software Debounce Polling (Edge Detection) ----
        static bool s_lastButtonState = digitalRead(PIN_SOS_BUTTON);
        bool currentReading = digitalRead(PIN_SOS_BUTTON);

        // Only trigger on the transition from HIGH to LOW (pressing the button)
        if (currentReading == LOW && s_lastButtonState == HIGH) {
            s_buttonPressCount++;
            if (s_buttonPressCount >= BUTTON_DEBOUNCE_TICKS) {
                g_state.sosButtonPressed = true;
                s_lastButtonState = LOW; // Register the press
                Serial.println("[EMG] Button press confirmed (software debounce)");
            }
        } else if (currentReading == HIGH) {
            s_buttonPressCount = 0;
            s_lastButtonState = HIGH;
        } else {
            // Button is being held LOW continuously, do nothing more.
            // This prevents continuous triggers and prevents triggering on boot
            // if the button is wired normally-closed.
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
