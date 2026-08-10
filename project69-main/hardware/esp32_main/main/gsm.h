/*
 * Sentinel Mesh — GSM Module (SIM800L)
 */

#ifndef GSM_H
#define GSM_H

#include "config.h"
#include "state.h"

void initGSM();

// Status
bool gsmIsReady();
bool gsmCheckNetwork();

// Communication
bool gsmSendSMS(const char* number, const char* message);
bool gsmMakeCall(const char* number);
bool gsmHangUp();

// GPRS / HTTP
bool gsmConnectGPRS();
int  gsmHttpPost(const char* url, const char* body);
int  gsmHttpsPut(const char* host, const char* path, const char* body, const char* auth);
int  gsmHttpsPost(const char* url, const char* body);
bool gsmDisconnectGPRS();

// Sync
bool gsmSync();

// Recovery
bool gsmRecover();

#endif // GSM_H
