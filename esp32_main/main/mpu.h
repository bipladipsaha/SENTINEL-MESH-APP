/*
 * Sentinel Mesh — MPU6050 Fall Detection
 */

#ifndef MPU_H
#define MPU_H

#include "config.h"
#include "state.h"

void initMPU();
void taskMPU(void* param);

#endif // MPU_H
