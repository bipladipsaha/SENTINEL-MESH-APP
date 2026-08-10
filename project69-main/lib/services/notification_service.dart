import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'auth_service.dart';
import '../main.dart'; // To access flutterLocalNotificationsPlugin

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();
  final AuthService _authService = AuthService();

  static const String channelId = 'sos_alerts';
  static const String channelName = 'SOS Alerts';

  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: true, // For iOS
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('[Notifications] User granted permission');
      await _setupNotificationChannel();
      await _syncToken();

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((token) {
        _saveTokenToDatabase(token);
      });

      // Foreground message handler
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        _showLocalNotification(message);
      });
    } else {
      debugPrint('[Notifications] User declined or has not accepted permission');
    }
  }

  Future<void> _setupNotificationChannel() async {
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      channelId,
      channelName,
      description: 'High priority alerts for nearby emergencies.',
      importance: Importance.max,
      playSound: true,
    );

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<void> _syncToken() async {
    try {
      String? token = await _messaging.getToken();
      if (token != null) {
        await _saveTokenToDatabase(token);
      }
    } catch (e) {
      debugPrint('[Notifications] Failed to get token: $e');
    }
  }

  Future<void> _saveTokenToDatabase(String token) async {
    final uid = _authService.currentUser?.uid;
    if (uid != null) {
      await _dbRef.child('user_tokens').child(uid).set({
        'token': token,
        'platform': defaultTargetPlatform.name,
        'updatedAt': DateTime.now().toIso8601String(),
      });
      debugPrint('[Notifications] FCM token saved to RTDB');
    }
  }

  void _showLocalNotification(RemoteMessage message) {
    RemoteNotification? notification = message.notification;
    AndroidNotification? android = message.notification?.android;

    if (notification != null && android != null) {
      flutterLocalNotificationsPlugin.show(
        notification.hashCode,
        notification.title,
        notification.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            channelId,
            channelName,
            channelDescription: 'High priority alerts for nearby emergencies.',
            importance: Importance.max,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
        ),
      );
    }
  }
}
