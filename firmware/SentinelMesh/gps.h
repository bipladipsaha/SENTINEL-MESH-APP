/*
 * Sentinel Mesh — GPS Module
 */

#ifndef GPS_H
#define GPS_H

#include "config.h"
#include "state.h"

void initGPS();
void taskGPS(void* param);

#endif // GPS_H
