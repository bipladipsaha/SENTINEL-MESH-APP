/*
 * Sentinel Mesh — Battery Monitor
 *
 * Reads battery voltage through a voltage divider on GPIO34.
 * Reports voltage, percentage (linear 3.0V–4.2V), and low-battery flag.
 *
 * Wiring:
 *   Battery+ ──┤R1├──┬──┤R2├── GND
 *                     │
 *                   GPIO34
 *
 *   With R1 = R2 = 100K → divider ratio = 2.0
 */

#include "battery.h"

// ---- Initialization ----

void initBattery() {
    analogSetAttenuation(ADC_11db);   // 0–3.6V range
    analogReadResolution(12);         // 0–4095
    pinMode(PIN_BATTERY_ADC, INPUT);

    // Take an initial reading
    int raw = analogRead(PIN_BATTERY_ADC);
    float voltage = (raw / 4095.0f) * 3.3f * BATTERY_DIVIDER_RATIO;

    Serial.printf("[BAT] Initialized — %.2fV\n", voltage);
}

// ---- Internal helpers ----

static float readVoltage() {
    // Average multiple samples for stability
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) {
        sum += analogRead(PIN_BATTERY_ADC);
        delayMicroseconds(100);
    }
    float raw = sum / 16.0f;
    return (raw / 4095.0f) * 3.3f * BATTERY_DIVIDER_RATIO;
}

static uint8_t voltageToPercent(float voltage) {
    if (voltage >= BATTERY_FULL_VOLTAGE) return 100;
    if (voltage <= BATTERY_EMPTY_VOLTAGE) return 0;
    float range = BATTERY_FULL_VOLTAGE - BATTERY_EMPTY_VOLTAGE;
    return (uint8_t)((voltage - BATTERY_EMPTY_VOLTAGE) / range * 100.0f);
}

// ---- FreeRTOS Task ----

void taskBattery(void* param) {
    (void)param;

    for (;;) {
        float voltage   = readVoltage();
        uint8_t percent = voltageToPercent(voltage);
        bool low        = (percent <= BATTERY_LOW_PERCENT);

        lockState();
        g_state.battery.voltage    = voltage;
        g_state.battery.percent    = percent;
        g_state.battery.lowBattery = low;
        unlockState();

        if (low) {
            Serial.printf("[BAT] LOW BATTERY: %.2fV (%d%%)\n", voltage, percent);
        }

        vTaskDelay(pdMS_TO_TICKS(BATTERY_READ_INTERVAL));
    }
}
