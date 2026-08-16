/*
 * Sentinel Mesh — Firebase SOS Alert
 *
 * Writes SOS alerts to Firebase Realtime Database so that
 * a Cloud Function can push-notify nearby app users via FCM.
 */

#ifndef FIREBASE_ALERT_H
#define FIREBASE_ALERT_H

#include "config.h"
#include "state.h"

void initFirebaseAlert();

// Write SOS alert to Firebase RTDB  (call once when emergency starts)
bool sendFirebaseSOSAlert();

// Clear the SOS alert in Firebase    (call when emergency is resolved)
bool sendFirebaseSOSResolved();

#endif // FIREBASE_ALERT_H
