/*
 * Sentinel Mesh — Configuration
 * 
 * All hardware pins, timing, thresholds, and user-configurable
 * settings in one place. Edit this file to match your wiring
 * and carrier settings.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
//  PIN DEFINITIONS
// ============================================================

// GPS (NEO-6M) — UART2
#define PIN_GPS_RX            16    // GPS TX → ESP32 GPIO16
#define PIN_GPS_TX            17    // GPS RX → ESP32 GPIO17

// LoRa (SX1278) — SPI
#define PIN_LORA_CS           13
#define PIN_LORA_RST          14
#define PIN_LORA_DIO0         26
#define PIN_LORA_SCK          18
#define PIN_LORA_MISO         19
#define PIN_LORA_MOSI         23

// MPU6050 — I2C
#define PIN_MPU_SDA           21
#define PIN_MPU_SCL           22

// SIM800L — UART1 (HardwareSerial)
// NOTE: GPIO2 is a strapping pin. It must be LOW during boot.
// SIM800L RX typically has a weak internal pull, which should
// not interfere with boot. If you have boot issues, add a
// 10K pull-down resistor on GPIO2.
#define PIN_SIM_RX            4     // SIM800L TX → ESP32 GPIO4
#define PIN_SIM_TX            33    // SIM800L RX → ESP32 GPIO33

// User Interface
#define PIN_SOS_BUTTON        27    // Active LOW with internal pull-up
#define PIN_LED_GREEN         25    // System ready indicator
#define PIN_LED_RED           32    // Emergency active indicator
#define PIN_LED_BLUE          15    // BLE pairing indicator

// Battery
#define PIN_BATTERY_ADC       34    // Input-only, via voltage divider

// ============================================================
//  DEVICE IDENTITY
// ============================================================

#define FIRMWARE_VERSION      "1.0.0"

// ============================================================
//  RADIO
// ============================================================

#define LORA_FREQUENCY        433E6       // 433 MHz (India/Asia)
#define LORA_SPREADING_FACTOR 7
#define LORA_BANDWIDTH        125E3       // 125 kHz
#define LORA_CODING_RATE      5           // 4/5
#define LORA_TX_POWER         20          // dBm (max)
#define LORA_MAGIC_HEADER     0x5D        // Sentinel Mesh packet ID

// ============================================================
//  SERIAL BAUD RATES
// ============================================================

#define SERIAL_DEBUG_BAUD     115200
#define GPS_BAUD              9600
#define GSM_BAUD              9600

// ============================================================
//  TIMING (milliseconds)
// ============================================================

#define GPS_READ_INTERVAL         100     // Read GPS serial often
#define LORA_BROADCAST_INTERVAL   5000    // LoRa TX every 5s
#define GPRS_UPLOAD_INTERVAL      4000    // HTTP POST every 4s
#define BATTERY_READ_INTERVAL     10000   // Battery check every 10s
#define FALL_COUNTDOWN_MS         15000   // 15-second fall countdown
#define LED_BLINK_FAST_MS         200     // Fast blink (transmitting)
#define LED_BLINK_SLOW_MS         1000    // Slow blink (countdown)
#define GSM_RECOVERY_INTERVAL     30000   // GSM recovery check
#define BUTTON_DEBOUNCE_MS        1000    // Button debounce
#define VOICE_CALL_DURATION_MS    30000   // Let call ring 30s
#define RESOLVED_CLEANUP_MS       2000    // Pause before READY
#define MPU_SAMPLE_INTERVAL       50      // 20 Hz sampling
#define IMPACT_ANALYSIS_TIMEOUT   30000   // 30s to confirm fall after impact

// ============================================================
//  FALL DETECTION THRESHOLDS
// ============================================================

#define IMPACT_THRESHOLD          2.5f    // g-force for impact
#define ORIENTATION_CHANGE_DEG    30.0f   // Degrees of orientation change
#define STILLNESS_ACC_THRESHOLD   0.3f    // Deviation from 1g
#define STILLNESS_GYRO_THRESHOLD  50.0f   // Degrees/sec
#define BASELINE_ACC_TOLERANCE    0.1f    // For baseline stability check
#define BASELINE_GYRO_TOLERANCE   20.0f   // For baseline stability check
#define BASELINE_SMOOTHING        0.95f   // EMA smoothing factor

// ============================================================
//  BATTERY CALIBRATION
// ============================================================

// Voltage divider: R1 and R2 (e.g., 100K + 100K → ratio = 2.0)
#define BATTERY_DIVIDER_RATIO     2.0f
#define BATTERY_FULL_VOLTAGE      4.2f
#define BATTERY_EMPTY_VOLTAGE     3.0f
#define BATTERY_LOW_PERCENT       20      // Low battery threshold (%)

// ============================================================
//  GSM / GPRS
// ============================================================

// APN — Change to your carrier's APN
// Jio: "jionet"   Airtel: "airtelgprs.com"   Vi: "internet"
#define GSM_APN               "airtelgprs.com"

// Backend API — Change to your server URL
#define BACKEND_URL           "https://myproject7698-default-rtdb.asia-southeast1.firebasedatabase.app/devices/device001.json"

// Vercel Backend Settings
#define VERCEL_URL            "https://sentinel-mesh-backend.vercel.app/api/sos"
#define VERCEL_SECRET         "super_secret_token_123"  // Must match VERCEL_SECRET in Vercel Environment Variables
#define VERCEL_BODY_SIZE      256                     // Payload buffer for Vercel SOS

// ============================================================
//  EMERGENCY CONTACTS — CHANGE THESE
// ============================================================

#define MAX_CONTACTS          3

#define CONTACT_1             "+918250025537"   // Family member 1
#define CONTACT_2             "+919875622802"   // Family member 2
#define CONTACT_3             "+917439303699"   // Family member 3

// Primary number for voice call
#define EMERGENCY_CALL_NUM    "+918250025537"   // Emergency services

// ============================================================
//  FIREBASE REALTIME DATABASE
// ============================================================

#define FIREBASE_HOST         "myproject7698-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH         "AIzaSyDpABsIXpyiE3kc8lcF4URQtZvad5qcuXE"
#define NOTIFY_RADIUS_M       1000    // Nearby user radius — 1 km (used by Cloud Function)
#define FIREBASE_BODY_SIZE    256     // JSON payload buffer for Firebase writes
#define VERCEL_BODY_SIZE_FB   256     // Alias for compatibility

// ============================================================
//  AT COMMAND BUFFERS
// ============================================================

#define AT_TIMEOUT            2000    // Default AT timeout (ms)
#define AT_LONG_TIMEOUT       10000   // Long AT timeout (ms)
#define AT_BUFFER_SIZE        256     // Response buffer
#define SMS_BUFFER_SIZE       256     // SMS text buffer
#define HTTP_BODY_SIZE        128     // JSON payload buffer
#define CMD_BUFFER_SIZE       128     // AT command builder buffer

// ============================================================
//  FREERTOS TASK STACKS (bytes)
// ============================================================

#define TASK_STACK_GPS        4096
#define TASK_STACK_MPU        4096
#define TASK_STACK_EMERGENCY  4096
#define TASK_STACK_COMM       8192    // GSM AT commands need headroom
#define TASK_STACK_BATTERY    2048

#endif // CONFIG_H
