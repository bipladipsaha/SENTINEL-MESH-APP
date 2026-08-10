import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class RouteAnomalyService {
  static final RouteAnomalyService _instance = RouteAnomalyService._internal();
  factory RouteAnomalyService() => _instance;
  RouteAnomalyService._internal();

  Database? _database;
  StreamSubscription<Position>? _positionStream;
  bool _isTracking = false;
  
  // Callback when user deviates from safe zones
  Function()? onRouteDeviationDetected;

  Future<void> initialize() async {
    try {
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, 'sentinel_mesh_routes.db');

      _database = await openDatabase(
        path,
        version: 1,
        onCreate: (db, version) async {
          await db.execute(
            'CREATE TABLE safe_zones (id INTEGER PRIMARY KEY, lat REAL, lng REAL, radius REAL)',
          );
        },
      );
      debugPrint('RouteAnomalyService initialized.');
    } catch (e) {
      debugPrint('Failed to init route DB: $e');
    }
  }

  Future<void> startTracking() async {
    if (_isTracking) return;

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('Location services are disabled.');
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return;
    }

    _isTracking = true;
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50, // update every 50 meters
      ),
    ).listen((Position position) {
      _checkLocationAgainstSafeZones(position);
    });
    
    debugPrint('RouteAnomalyService started tracking.');
  }

  Future<void> _checkLocationAgainstSafeZones(Position currentPos) async {
    if (_database == null) return;
    
    // TODO: Query the SQLite DB for safe_zones
    // TODO: Use Geolocator.distanceBetween to check if currentPos is within any safe_zone radius
    
    bool isSafe = true; // Placeholder logic
    
    if (!isSafe) {
      debugPrint('User has deviated from safe routes!');
      onRouteDeviationDetected?.call();
    }
  }

  Future<void> stopTracking() async {
    if (!_isTracking) return;
    _isTracking = false;
    await _positionStream?.cancel();
    debugPrint('RouteAnomalyService stopped tracking.');
  }
}
