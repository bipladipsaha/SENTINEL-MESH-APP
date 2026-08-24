/*
 * Sentinel Mesh — BLE Communication
 */

#include "ble_manager.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define ALERT_CHAR_UUID     "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"

BLEServer* pServer = NULL;
BLECharacteristic* pAlertCharacteristic = NULL;
BLECharacteristic* pBatteryCharacteristic = NULL;
static bool deviceConnected = false;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        lockState();
        g_state.bleConnected = true;
        unlockState();
        digitalWrite(PIN_LED_BLUE, HIGH); // Solid blue when connected
        Serial.println("[BLE] Device connected");
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        lockState();
        g_state.bleConnected = false;
        unlockState();
        digitalWrite(PIN_LED_BLUE, LOW);
        Serial.println("[BLE] Device disconnected");
        // Restart advertising
        pServer->startAdvertising();
        Serial.println("[BLE] Restarting advertising");
    }
};

void notifyBLEAlert(const char* payload) {
    if (pAlertCharacteristic != NULL) {
        pAlertCharacteristic->setValue(payload);
        if (deviceConnected) {
            pAlertCharacteristic->notify();
            Serial.printf("[BLE] Notified Web App: %s\n", payload);
        } else {
            Serial.printf("[BLE] Value updated to '%s' (no devices connected to notify)\n", payload);
        }
    }
}

void initBLE() {
    pinMode(PIN_LED_BLUE, OUTPUT);
    digitalWrite(PIN_LED_BLUE, LOW);

    // Get the name from state
    lockState();
    String deviceName = g_state.deviceIdStr;
    unlockState();

    Serial.printf("[BLE] Initializing as %s\n", deviceName.c_str());

    BLEDevice::init(deviceName.c_str());
    BLEDevice::setMTU(512);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    // 1. Primary SentinelMesh Service
    BLEService *pService = pServer->createService(SERVICE_UUID);

    BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID,
                                         BLECharacteristic::PROPERTY_READ
                                       );
                                       
    pAlertCharacteristic = pService->createCharacteristic(
                                         ALERT_CHAR_UUID,
                                         BLECharacteristic::PROPERTY_NOTIFY |
                                         BLECharacteristic::PROPERTY_READ
                                       );

    // Add descriptor for notify
    pAlertCharacteristic->addDescriptor(new BLE2902());
    pAlertCharacteristic->setValue("IDLE"); // Initialize to safe value

    pCharacteristic->setValue(deviceName.c_str());
    pService->start();

    // 2. Standard Battery Service
    BLEService *pBatteryService = pServer->createService(BLEUUID((uint16_t)0x180F));
    pBatteryCharacteristic = pBatteryService->createCharacteristic(
                                         BLEUUID((uint16_t)0x2A19),
                                         BLECharacteristic::PROPERTY_READ |
                                         BLECharacteristic::PROPERTY_NOTIFY
                                       );
    pBatteryCharacteristic->addDescriptor(new BLE2902());
    uint8_t initialBat = 100;
    pBatteryCharacteristic->setValue(&initialBat, 1);
    pBatteryService->start();

    // Advertising
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->addServiceUUID(BLEUUID((uint16_t)0x180F));
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // helps with iPhone connections issue
    pAdvertising->setMaxPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("[BLE] Advertising started. Waiting for connections...");
}

void taskBLE(void* param) {
    (void)param;
    bool ledState = false;
    int connectedTicks = 0;

    for (;;) {
        // If not connected, blink the blue LED
        if (!deviceConnected) {
            ledState = !ledState;
            digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW);
            vTaskDelay(pdMS_TO_TICKS(500));
            connectedTicks = 0;
        } else {
            // Keep solid blue when connected
            digitalWrite(PIN_LED_BLUE, HIGH);
            
            // Periodically update the battery characteristic every 10 seconds
            if (connectedTicks % 20 == 0) {
                lockState();
                uint8_t currentBat = g_state.battery.percent;
                unlockState();
                
                if (pBatteryCharacteristic != NULL) {
                    pBatteryCharacteristic->setValue(&currentBat, 1);
                    pBatteryCharacteristic->notify();
                }
            }
            
            connectedTicks++;
            vTaskDelay(pdMS_TO_TICKS(500));
        }
    }
}
