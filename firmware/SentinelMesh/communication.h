/*
 * Sentinel Mesh — Communication Manager
 */

#ifndef COMMUNICATION_H
#define COMMUNICATION_H

#include "config.h"
#include "state.h"

void initCommunication();
void taskCommunication(void* param);

#endif // COMMUNICATION_H
