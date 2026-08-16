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
int  gsmHttpsPut(const char* url, const char* body);   // HTTPS PUT for Firebase RTDB
int  gsmHttpsPost(const char* url, const char* body);  // HTTPS POST for Vercel backend
bool gsmDisconnectGPRS();

// Recovery
bool gsmRecover();
bool gsmSync();

#endif // GSM_H
