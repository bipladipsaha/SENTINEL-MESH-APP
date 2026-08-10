const admin = require('firebase-admin');
const geolib = require('geolib');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://myproject7698-default-rtdb.asia-southeast1.firebasedatabase.app"
        });
    } catch (error) {
        console.error("Firebase Initialization Error", error);
    }
}

module.exports = async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { deviceId, lat, lon, type, battery, active, secret } = req.body;
    
    // Verify secret to ensure only our ESP32 can call this
    if (secret !== process.env.VERCEL_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!deviceId) {
        return res.status(400).json({ error: 'Missing deviceId' });
    }

    try {
        const db = admin.database();

        // 1. Write the SOS payload to Firebase so the mobile app dashboard sees it
        await db.ref(`/sos_alerts/${deviceId}`).set({
            deviceId,
            lat,
            lon,
            type,
            battery,
            active,
            timestamp: Date.now()
        });

        // If active is false (resolved), we don't need to send push notifications
        if (!active) {
            return res.status(200).json({ success: true, message: 'SOS Resolved' });
        }

        const notifyRadius = 1000; // meters

        // 2. Fetch all user locations to find who is nearby
        const locationsSnap = await db.ref('/user_locations').once('value');
        const locations = locationsSnap.val();
        
        if (!locations) {
            return res.status(200).json({ success: true, message: 'No users to notify' });
        }

        const nearbyUserIds = [];
        
        for (const [userId, loc] of Object.entries(locations)) {
            if (loc.lat && loc.lon) {
                const distance = geolib.getDistance(
                    { latitude: lat, longitude: lon },
                    { latitude: loc.lat, longitude: loc.lon }
                );
                
                if (distance <= notifyRadius) {
                    nearbyUserIds.push(userId);
                }
            }
        }

        if (nearbyUserIds.length === 0) {
            return res.status(200).json({ success: true, message: 'No nearby users found' });
        }

        // 3. Fetch FCM tokens for nearby users
        const tokens = [];
        for (const userId of nearbyUserIds) {
            const tokenSnap = await db.ref(`/user_tokens/${userId}/token`).once('value');
            const token = tokenSnap.val();
            if (token) {
                tokens.push(token);
            }
        }

        if (tokens.length === 0) {
            return res.status(200).json({ success: true, message: 'No FCM tokens found for nearby users' });
        }

        // 4. Send FCM Push Notifications
        const message = {
            notification: {
                title: "Sentinel Mesh EMERGENCY",
                body: `An SOS has been triggered nearby! (Distance: < 1km)`
            },
            data: {
                deviceId: String(deviceId),
                lat: String(lat),
                lon: String(lon),
                type: String(type)
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        return res.status(200).json({ 
            success: true, 
            messagesSent: response.successCount 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
