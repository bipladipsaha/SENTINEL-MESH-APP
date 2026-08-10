/*
 * Sentinel Mesh — MPU6050 Fall Detection
 *
 * Three-phase fall detection to reduce false alarms:
 *
 *   Phase 1 — Impact:  Total acceleration exceeds IMPACT_THRESHOLD (2.5g)
 *   Phase 2 — Orientation:  Gravity vector angle changed > 30° from baseline
 *                           (person was upright, now horizontal)
 *   Phase 3 — Stillness:  Device is motionless → signal fallDetected
 *
 * The Emergency task then runs a 15-second countdown.
 * During countdown, this task monitors for movement to cancel.
 */

#include "mpu.h"
#include <Wire.h>
#include <math.h>

#define MPU_ADDR   0x68

// ---- Live sensor readings ----
static float ax, ay, az;    // Accelerometer (g)
static float gx, gy, gz;    // Gyroscope (°/s)

// ---- Baseline orientation (updated when device is stable) ----
static float baseAx, baseAy, baseAz;
static bool  baselineSet = false;

// ---- Fall-detection state ----
static bool          impactDetected     = false;
static unsigned long impactTime         = 0;
static bool          orientationChanged = false;

// ============================================================
//  Internal helpers
// ============================================================

static void readRawMPU() {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);  // ACCEL_XOUT_H
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, (int)14);

    if (Wire.available() == 14) {
        int16_t ax_raw = (Wire.read() << 8) | Wire.read();
        int16_t ay_raw = (Wire.read() << 8) | Wire.read();
        int16_t az_raw = (Wire.read() << 8) | Wire.read();
        Wire.read(); Wire.read();   // skip temperature
        int16_t gx_raw = (Wire.read() << 8) | Wire.read();
        int16_t gy_raw = (Wire.read() << 8) | Wire.read();
        int16_t gz_raw = (Wire.read() << 8) | Wire.read();

        ax = ax_raw / 16384.0f;    // ±2g
        ay = ay_raw / 16384.0f;
        az = az_raw / 16384.0f;

        gx = gx_raw / 131.0f;     // ±250°/s
        gy = gy_raw / 131.0f;
        gz = gz_raw / 131.0f;
    }
}

/* Update the gravity-vector baseline when the device is stationary. */
static void updateBaseline() {
    float totalAcc  = sqrtf(ax * ax + ay * ay + az * az);
    float totalGyro = sqrtf(gx * gx + gy * gy + gz * gz);

    if (fabsf(totalAcc - 1.0f) < BASELINE_ACC_TOLERANCE &&
        totalGyro < BASELINE_GYRO_TOLERANCE) {
        if (!baselineSet) {
            baseAx = ax;  baseAy = ay;  baseAz = az;
            baselineSet = true;
        } else {
            // Exponential moving average
            float a = BASELINE_SMOOTHING;
            baseAx = baseAx * a + ax * (1.0f - a);
            baseAy = baseAy * a + ay * (1.0f - a);
            baseAz = baseAz * a + az * (1.0f - a);
        }
    }
}

/*
 * Angle between the baseline gravity vector and the current one.
 * Returns degrees.  0° = same orientation, 90° = perpendicular, 180° = flipped.
 */
static float computeOrientationAngle() {
    float dot      = baseAx * ax + baseAy * ay + baseAz * az;
    float magBase  = sqrtf(baseAx * baseAx + baseAy * baseAy + baseAz * baseAz);
    float magCurr  = sqrtf(ax * ax + ay * ay + az * az);

    if (magBase < 0.01f || magCurr < 0.01f) return 0.0f;

    float cosAngle = dot / (magBase * magCurr);
    // Clamp to avoid NaN from acos due to float imprecision
    if (cosAngle >  1.0f) cosAngle =  1.0f;
    if (cosAngle < -1.0f) cosAngle = -1.0f;

    return acosf(cosAngle) * 180.0f / PI;
}

/* True when the device is essentially motionless. */
static bool isDeviceStill() {
    float totalAcc  = sqrtf(ax * ax + ay * ay + az * az);
    float totalGyro = sqrtf(gx * gx + gy * gy + gz * gz);

    return (fabsf(totalAcc - 1.0f) < STILLNESS_ACC_THRESHOLD &&
            totalGyro < STILLNESS_GYRO_THRESHOLD);
}

// ============================================================
//  Public API
// ============================================================

void initMPU() {
    Wire.begin(PIN_MPU_SDA, PIN_MPU_SCL);
    Wire.setClock(100000);

    // Wake up MPU6050
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x6B);   // PWR_MGMT_1
    Wire.write(0x00);   // Clear sleep bit
    Wire.endTransmission();

    // Accelerometer ±2g
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x1C);
    Wire.write(0x00);
    Wire.endTransmission();

    // Gyroscope ±250°/s
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x1B);
    Wire.write(0x00);
    Wire.endTransmission();

    lockState();
    g_state.mpuReady = true;
    unlockState();

    Serial.println("[MPU] MPU6050 initialized (±2g, ±250°/s)");
}

// ============================================================
//  FreeRTOS Task
// ============================================================

void taskMPU(void* param) {
    (void)param;

    // Let the sensor stabilise after power-on
    vTaskDelay(pdMS_TO_TICKS(1000));

    for (;;) {
        EmergencyState currentState = getEmergencyState();

        // Only run fall detection in READY or COUNTDOWN
        if (currentState != STATE_READY && currentState != STATE_COUNTDOWN) {
            vTaskDelay(pdMS_TO_TICKS(MPU_SAMPLE_INTERVAL));
            continue;
        }

        readRawMPU();

        // ======== STATE_READY — full fall detection pipeline ========
        if (currentState == STATE_READY) {

            // Keep baseline up-to-date while idle
            if (!impactDetected) {
                updateBaseline();
            }

            float totalAcc = sqrtf(ax * ax + ay * ay + az * az);

            // Phase 1 — Impact
            if (!impactDetected && baselineSet && totalAcc > IMPACT_THRESHOLD) {
                impactDetected     = true;
                impactTime         = millis();
                orientationChanged = false;
                Serial.printf("[MPU] Impact! Acc=%.2fg\n", totalAcc);
            }

            // Phase 2 — Orientation change (only after impact)
            if (impactDetected && !orientationChanged) {
                float angle = computeOrientationAngle();
                if (angle > ORIENTATION_CHANGE_DEG) {
                    orientationChanged = true;
                    Serial.printf("[MPU] Orientation changed: %.1f°\n", angle);
                }
            }

            // Phase 3 — Stillness after impact + orientation change
            if (impactDetected && orientationChanged && isDeviceStill()) {
                Serial.println("[MPU] Fall detected → signalling emergency task");

                lockState();
                g_state.fallDetected = true;
                unlockState();

                // Reset internal detection state
                impactDetected     = false;
                orientationChanged = false;
            }

            // Timeout — if we don't confirm a fall within 30 s, reset
            if (impactDetected &&
                (millis() - impactTime > IMPACT_ANALYSIS_TIMEOUT)) {
                Serial.println("[MPU] Impact analysis timeout, resetting");
                impactDetected     = false;
                orientationChanged = false;
            }
        }

        // ======== STATE_COUNTDOWN — movement cancellation ========
        if (currentState == STATE_COUNTDOWN) {
            if (!isDeviceStill()) {
                Serial.println("[MPU] Movement during countdown → cancel");
                lockState();
                g_state.fallDetected = false;
                unlockState();
                // Emergency task will see fallDetected==false and revert to READY
            }
        }

        vTaskDelay(pdMS_TO_TICKS(MPU_SAMPLE_INTERVAL));
    }
}
