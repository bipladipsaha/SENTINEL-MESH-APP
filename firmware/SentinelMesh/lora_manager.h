/*
 * Sentinel Mesh — LoRa Communication
 */

#ifndef LORA_MANAGER_H
#define LORA_MANAGER_H

#include "config.h"
#include "state.h"

// ---- Binary Packet (compact, with sequence number) ----
struct __attribute__((packed)) LoRaPacket {
    uint8_t   header;          // LORA_MAGIC_HEADER (0x5D)
    uint16_t  deviceId;        // DEVICE_ID
    uint16_t  sequence;        // Incrementing packet counter
    int32_t   latitude;        // lat × 1 000 000  (fixed-point)
    int32_t   longitude;       // lon × 1 000 000  (fixed-point)
    uint8_t   battery;         // 0–100 %
    uint8_t   emergencyType;   // EmergencyType enum value
    uint32_t  timestamp;       // millis()/1000 since boot
    uint8_t   checksum;        // XOR of all preceding bytes
};
// Total size: 1+2+2+4+4+1+1+4+1 = 20 bytes

void       initLoRa();
LoRaPacket buildEmergencyPacket();
bool       sendLoRaPacket(const LoRaPacket& pkt);

#endif // LORA_MANAGER_H
