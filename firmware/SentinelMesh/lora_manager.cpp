/*
 * Sentinel Mesh — LoRa Communication
 *
 * Transmits compact binary packets on 433 MHz using the SX1278.
 * Packets include a sequence number so receivers can detect
 * duplicates and gaps.
 */

#include "lora_manager.h"
#include <SPI.h>
#include <LoRa.h>

static uint16_t packetSequence = 0;

// ---- Checksum: XOR of every byte before the checksum field ----

static uint8_t computeChecksum(const uint8_t* data, size_t len) {
    uint8_t cs = 0;
    for (size_t i = 0; i < len; i++) {
        cs ^= data[i];
    }
    return cs;
}

// ============================================================
//  Public API
// ============================================================

void initLoRa() {
    SPI.begin(PIN_LORA_SCK, PIN_LORA_MISO, PIN_LORA_MOSI, PIN_LORA_CS);
    LoRa.setPins(PIN_LORA_CS, PIN_LORA_RST, PIN_LORA_DIO0);

    if (!LoRa.begin((long)LORA_FREQUENCY)) {
        Serial.println("[LORA] Init FAILED — check wiring!");
        return;
    }

    LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
    LoRa.setSignalBandwidth((long)LORA_BANDWIDTH);
    LoRa.setCodingRate4(LORA_CODING_RATE);
    LoRa.setTxPower(LORA_TX_POWER);

    lockState();
    g_state.loraReady = true;
    unlockState();

    Serial.println("[LORA] Initialized — 433 MHz, SF7, 125 kHz");
}

LoRaPacket buildEmergencyPacket() {
    LoRaPacket pkt;
    memset(&pkt, 0, sizeof(pkt));

    pkt.header   = LORA_MAGIC_HEADER;
    pkt.deviceId = g_state.deviceIdShort;
    pkt.sequence = packetSequence++;

    lockState();
    pkt.latitude      = (int32_t)(g_state.gps.latitude  * 1e6f);
    pkt.longitude     = (int32_t)(g_state.gps.longitude  * 1e6f);
    pkt.battery       = g_state.battery.percent;
    pkt.emergencyType = (uint8_t)g_state.emergencyType;
    unlockState();

    pkt.timestamp = (uint32_t)(millis() / 1000UL);

    // Checksum over everything except the last byte (checksum itself)
    pkt.checksum = computeChecksum((const uint8_t*)&pkt,
                                   sizeof(pkt) - sizeof(pkt.checksum));
    return pkt;
}

bool sendLoRaPacket(const LoRaPacket& pkt) {
    if (!g_state.loraReady) {
        Serial.println("[LORA] Not ready — skipping TX");
        return false;
    }

    LoRa.beginPacket();
    LoRa.write((const uint8_t*)&pkt, sizeof(pkt));
    LoRa.endPacket();

    Serial.printf("[LORA] TX  seq=%u  lat=%.6f  lon=%.6f  bat=%u%%  type=%u\n",
                  pkt.sequence,
                  pkt.latitude  / 1e6f,
                  pkt.longitude / 1e6f,
                  pkt.battery,
                  pkt.emergencyType);
    return true;
}
