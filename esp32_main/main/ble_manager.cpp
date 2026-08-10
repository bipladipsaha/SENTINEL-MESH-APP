#include "ble_manager.h"
#include "config.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE UUIDs matching the Flutter app
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"

void initBLE() {
    Serial.println("[BLE] Initialising Bluetooth Low Energy...");

    // Generate device name based on ID, padded with zeros: e.g., "SM-00001"
    char deviceName[20];
    snprintf(deviceName, sizeof(deviceName), "SM-%05d", DEVICE_ID);
    
    BLEDevice::init(deviceName);
    BLEServer *pServer = BLEDevice::createServer();
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // Create a characteristic to expose the device ID
    BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                           CHARACTERISTIC_UUID,
                                           BLECharacteristic::PROPERTY_READ
                                         );
    
    pCharacteristic->setValue(deviceName);
    pService->start();

    // Start advertising
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // help with iPhone connections issue
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.printf("[BLE] Server started! Advertising as %s\n", deviceName);
}
