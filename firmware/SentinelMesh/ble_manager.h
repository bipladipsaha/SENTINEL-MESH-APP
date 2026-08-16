/*
 * Sentinel Mesh — BLE Communication
 */

#ifndef BLE_MANAGER_H
#define BLE_MANAGER_H

#include "config.h"
#include "state.h"

void initBLE();
void taskBLE(void* param);
void notifyBLEAlert(const char* payload);

#endif // BLE_MANAGER_H
