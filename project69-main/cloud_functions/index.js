/**
 * Sentinel Mesh — Firebase Cloud Function
 *
 * Triggers when the ESP32 hardware writes an SOS alert to:
 *   /sos_alerts/{deviceId}
 *
 * Workflow:
 *   1. Read the SOS alert data (lat, lon, type, deviceId)
 *   2. Query /user_locations to find app users within NOTIFY_RADIUS_M
 *   3. Fetch their FCM tokens from /user_tokens
 *   4. Send push notification via FCM
 *
 * Database structure expected:
 *
 *   /sos_alerts/{deviceId}:
 *     { deviceId, lat, lon, type, battery, timestamp, active }
 *
 *   /user_locations/{userId}:
 *     { lat, lon, timestamp }
 *
 *   /user_tokens/{userId}:
 *     { token, platform }
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getDistance } = require("geolib");

admin.initializeApp();
const db = admin.database();

// ---- Configuration ----
const NOTIFY_RADIUS_METERS = 1000; // Notify users within 1 km
const STALE_LOCATION_MS = 30 * 60 * 1000; // Ignore locations older than 30 min

/**
 * Triggered whenever /sos_alerts/{deviceId} is written to.
 *
 * The ESP32 writes here via HTTPS PUT through the SIM800L modem.
 * This function fans out FCM push notifications to nearby app users.
 */
exports.onSOSAlert = functions
  .region("asia-southeast1") // Same region as your RTDB
  .database.ref("/sos_alerts/{deviceId}")
  .onWrite(async (change, context) => {
    const deviceId = context.params.deviceId;
    const alertData = change.after.val();

    // ---- Guard: only act on active SOS alerts ----
    if (!alertData || alertData.active !== true) {
      console.log(`[${deviceId}] Alert inactive or deleted — skipping.`);
      return null;
    }

    const sosLat = alertData.lat;
    const sosLon = alertData.lon;
    const sosType = alertData.type || "SOS";
    const sosBattery = alertData.battery || 0;

    console.log(
      `[${deviceId}] 🚨 SOS ALERT — Type: ${sosType}, ` +
        `Location: (${sosLat}, ${sosLon}), Battery: ${sosBattery}%`
    );

    // ---- If GPS is not available, still send to ALL users ----
    const hasGPS = sosLat !== 0 || sosLon !== 0;

    // ---- Query all user locations ----
    const locationsSnap = await db.ref("/user_locations").once("value");
    if (!locationsSnap.exists()) {
      console.log("No user locations found in database.");
      return null;
    }

    const now = Date.now();
    const nearbyUserIds = [];

    locationsSnap.forEach((childSnap) => {
      const userId = childSnap.key;
      const userData = childSnap.val();

      if (!userData || !userData.lat || !userData.lon) return;

      // Skip stale locations (older than 30 minutes)
      if (userData.timestamp && now - userData.timestamp > STALE_LOCATION_MS) {
        console.log(`  [${userId}] Location stale — skipping.`);
        return;
      }

      // If device has no GPS, notify ALL active users
      if (!hasGPS) {
        nearbyUserIds.push(userId);
        console.log(`  [${userId}] No GPS on device — including all users.`);
        return;
      }

      // Calculate distance
      const distance = getDistance(
        { latitude: sosLat, longitude: sosLon },
        { latitude: userData.lat, longitude: userData.lon }
      );

      console.log(`  [${userId}] Distance: ${distance}m`);

      if (distance <= NOTIFY_RADIUS_METERS) {
        nearbyUserIds.push(userId);
        console.log(`  [${userId}] ✓ Within radius — will notify.`);
      }
    });

    if (nearbyUserIds.length === 0) {
      console.log("No nearby users found within radius.");
      return null;
    }

    console.log(
      `Found ${nearbyUserIds.length} nearby user(s). Fetching FCM tokens...`
    );

    // ---- Fetch FCM tokens for nearby users ----
    const tokens = [];
    const tokenFetches = nearbyUserIds.map(async (userId) => {
      const tokenSnap = await db
        .ref(`/user_tokens/${userId}/token`)
        .once("value");
      if (tokenSnap.exists()) {
        tokens.push(tokenSnap.val());
      } else {
        console.log(`  [${userId}] No FCM token found.`);
      }
    });

    await Promise.all(tokenFetches);

    if (tokens.length === 0) {
      console.log("No FCM tokens available for nearby users.");
      return null;
    }

    console.log(`Sending FCM to ${tokens.length} device(s)...`);

    // ---- Build notification ----
    const mapsUrl =
      hasGPS && sosLat && sosLon
        ? `https://maps.google.com/?q=${sosLat},${sosLon}`
        : null;

    const notification = {
      title: "🚨 SOS Alert Nearby!",
      body: hasGPS
        ? `Someone nearby needs help! (${sosType}) Tap for location.`
        : `Someone nearby triggered an SOS! (${sosType}) GPS acquiring...`,
    };

    const dataPayload = {
      type: "SOS_ALERT",
      deviceId: deviceId,
      sosType: sosType,
      lat: String(sosLat),
      lon: String(sosLon),
      battery: String(sosBattery),
      mapsUrl: mapsUrl || "",
      timestamp: String(alertData.timestamp || 0),
    };

    // ---- Send FCM messages ----
    const message = {
      notification: notification,
      data: dataPayload,
      android: {
        priority: "high",
        notification: {
          channelId: "sos_alerts",
          sound: "alarm",
          priority: "max",
          defaultVibrateTimings: false,
          vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `FCM sent: ${response.successCount} success, ${response.failureCount} failure`
      );

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (resp.error) {
            console.log(
              `  Token ${idx} failed: ${resp.error.code} — ${resp.error.message}`
            );
          }
        });
      }
    } catch (error) {
      console.error("FCM send error:", error);
    }

    return null;
  });

/**
 * Optional: When SOS is resolved, send a "safe" notification to
 * the same users who were previously notified.
 */
exports.onSOSResolved = functions
  .region("asia-southeast1")
  .database.ref("/sos_alerts/{deviceId}/active")
  .onUpdate(async (change, context) => {
    const deviceId = context.params.deviceId;
    const wasActive = change.before.val();
    const isActive = change.after.val();

    // Only trigger when transitioning from active → inactive
    if (wasActive !== true || isActive !== false) {
      return null;
    }

    console.log(`[${deviceId}] SOS resolved — sending all-clear.`);

    // Read all user tokens (in production, you'd track who was notified)
    const tokensSnap = await db.ref("/user_tokens").once("value");
    if (!tokensSnap.exists()) return null;

    const tokens = [];
    tokensSnap.forEach((child) => {
      if (child.val() && child.val().token) {
        tokens.push(child.val().token);
      }
    });

    if (tokens.length === 0) return null;

    const message = {
      notification: {
        title: "✅ SOS Resolved",
        body: `The SOS alert from device ${deviceId} has been resolved.`,
      },
      data: {
        type: "SOS_RESOLVED",
        deviceId: deviceId,
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `All-clear sent: ${response.successCount} success, ${response.failureCount} failure`
      );
    } catch (error) {
      console.error("FCM all-clear error:", error);
    }

    return null;
  });
