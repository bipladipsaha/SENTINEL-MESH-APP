import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/foundation.dart';
import 'auth_service.dart';

class LocationSyncService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();
  final AuthService _authService = AuthService();
  Timer? _syncTimer;

  // Sync every 5 minutes while the app is running
  static const Duration syncInterval = Duration(minutes: 5);

  void startSyncing() {
    _syncLocation(); // Run immediately
    _syncTimer = Timer.periodic(syncInterval, (timer) {
      _syncLocation();
    });
  }

  void stopSyncing() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  Future<void> _syncLocation() async {
    final uid = _authService.currentUser?.uid;
    if (uid == null) return;

    try {
      // Check permissions first to avoid exceptions on every timer tick
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return;
      }

      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );

      await _dbRef.child('user_locations').child(uid).set({
        'lat': pos.latitude,
        'lon': pos.longitude,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
      debugPrint('[LocationSync] Location updated for user $uid');
    } catch (e) {
      debugPrint('[LocationSync] Error syncing location: $e');
    }
  }
}
