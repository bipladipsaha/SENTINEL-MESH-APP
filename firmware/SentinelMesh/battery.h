/*
 * Sentinel Mesh — Battery Monitor
 */

#ifndef BATTERY_H
#define BATTERY_H

#include "config.h"
#include "state.h"

void initBattery();
void taskBattery(void* param);

#endif // BATTERY_H
