/*
 * Sentinel Mesh — Emergency State Machine
 */

#ifndef EMERGENCY_H
#define EMERGENCY_H

#include "config.h"
#include "state.h"

void initEmergency();
void taskEmergency(void* param);

#endif // EMERGENCY_H
