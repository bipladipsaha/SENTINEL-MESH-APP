import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:camera/camera.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'services/ai_orchestrator_service.dart';
import 'services/notification_service.dart';
import 'services/location_sync_service.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 1. Initialize Camera (Non-blocking)
  try {
    await availableCameras();
  } catch (_) {}
  
  // Load env
  await dotenv.load(fileName: ".env");

  // 2. Initialize Firebase
  try {
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: dotenv.env['FIREBASE_API_KEY'] ?? '',
        authDomain: dotenv.env['FIREBASE_AUTH_DOMAIN'] ?? '',
        databaseURL: dotenv.env['FIREBASE_DATABASE_URL'] ?? '',
        projectId: dotenv.env['FIREBASE_PROJECT_ID'] ?? '',
        storageBucket: dotenv.env['FIREBASE_STORAGE_BUCKET'] ?? '',
        messagingSenderId: dotenv.env['FIREBASE_MESSAGING_SENDER_ID'] ?? '',
        appId: dotenv.env['FIREBASE_APP_ID'] ?? '',
      ),
    );
  } catch (e) {
    debugPrint("Firebase Init Error: $e");
  }
  
  // 3. Initialize Notifications
  const AndroidInitializationSettings initSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
  const InitializationSettings initSettings = InitializationSettings(android: initSettingsAndroid);
  await flutterLocalNotificationsPlugin.initialize(initSettings);

  // Initialize Notification Service for FCM
  final NotificationService notificationService = NotificationService();
  await notificationService.initialize();

  // Initialize Location Sync Service
  final LocationSyncService locationSyncService = LocationSyncService();
  locationSyncService.startSyncing();

  // 4. Start AI Orchestrator in foreground
  AIOrchestrator().start();

  // 5. Request Location and Bluetooth Permissions
  // (Moved to HomeScreen.dart so it runs inside a valid UI context)
  
  runApp(const SentinelSafeApp());
}

class SentinelSafeApp extends StatelessWidget {
  const SentinelSafeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'SentinelSafe',
      theme: AppTheme.darkTheme,
      routerConfig: AppRouter.router,
    );
  }
}


