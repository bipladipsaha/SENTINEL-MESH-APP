import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_colors.dart';
import 'package:url_launcher/url_launcher.dart';

class ResponderScreen extends StatefulWidget {
  final List<String> deviceIds;
  const ResponderScreen({super.key, required this.deviceIds});

  @override
  State<ResponderScreen> createState() => _ResponderScreenState();
}

class _ResponderScreenState extends State<ResponderScreen> {
  Position? _myLocation;
  bool _nearbyAlertActive = false;
  LatLng? _victimLocation;
  String _alertMessage = "Monitoring nearby emergency signals...";
  StreamSubscription? _devicesSubscription;
  mapbox.MapboxMap? _mapboxMap;
  mapbox.CircleAnnotationManager? _circleAnnotationManager;

  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  @override
  void initState() {
    super.initState();
    _initNotifications();
    _initResponderTracking();
  }

  Future<void> _initNotifications() async {
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initSettings =
        InitializationSettings(android: androidSettings);
    await _localNotificationsPlugin.initialize(initSettings);
  }

  void _showNotification(String title, String body) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'responder_channel',
      'Responder Alerts',
      channelDescription: 'Alerts for nearby emergencies',
      importance: Importance.max,
      priority: Priority.high,
    );
    const NotificationDetails details = NotificationDetails(android: androidDetails);
    await _localNotificationsPlugin.show(0, title, body, details);
  }

  Future<void> _initResponderTracking() async {
    var status = await Permission.location.request();
    if (status.isGranted) {
      try {
        _myLocation = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      } catch (e) {
        debugPrint("Location error: $e");
      }
    }

    _devicesSubscription = FirebaseDatabase.instance.ref('devices').onValue.listen((event) {
      if (event.snapshot.value == null) return;
      
      final Map<dynamic, dynamic> allDevices = event.snapshot.value as Map<dynamic, dynamic>;
      bool alertFound = false;
      Map<String, dynamic>? victimData;

      for (var val in allDevices.values) {
        final data = Map<String, dynamic>.from(val as Map);
        if (data['status'] == 'ACTIVE') {
          final int? ts = data['timestamp'] as int?;
          if (ts == null) continue;
          final age = DateTime.now().millisecondsSinceEpoch - ts;
          if (age < 0 || age > 300000) continue; // older than 5 mins ignore

          victimData = data;
          alertFound = true;
          break;
        }
      }

      if (alertFound && victimData != null) {
        double? vLat = victimData['lat'] != null ? (victimData['lat'] as num).toDouble() : null;
        double? vLng = victimData['lng'] != null ? (victimData['lng'] as num).toDouble() : null;
        
        if (vLat != null && vLng != null) {
          if (!_nearbyAlertActive) {
            _showNotification("NEARBY EMERGENCY", "An SOS was triggered near you.");
          }
          if (mounted) {
            setState(() {
              _nearbyAlertActive = true;
              _victimLocation = LatLng(vLat, vLng);
              _alertMessage = "EMERGENCY DETECTED NEARBY!";
            });
            if (_mapboxMap != null) {
                _mapboxMap!.setCamera(mapbox.CameraOptions(
                  center: mapbox.Point(coordinates: mapbox.Position(vLng, vLat)),
                  zoom: 15.0,
                ));
                _updateMarker();
            }
          }
        }
      } else {
        if (mounted) {
          setState(() {
            _nearbyAlertActive = false;
            _victimLocation = null;
            _alertMessage = "Monitoring nearby emergency signals...";
          });
        }
      }
    });
  }
  
  void _updateMarker() {
      if (_circleAnnotationManager == null || _victimLocation == null) return;
      _circleAnnotationManager!.deleteAll();
      _circleAnnotationManager!.create(mapbox.CircleAnnotationOptions(
        geometry: mapbox.Point(coordinates: mapbox.Position(_victimLocation!.longitude, _victimLocation!.latitude)),
        circleColor: AppColors.colorDanger.value,
        circleRadius: 10.0,
        circleStrokeWidth: 3.0,
        circleStrokeColor: Colors.white.value,
      ));
  }

  Future<void> _onMapCreated(mapbox.MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    _circleAnnotationManager = await mapboxMap.annotations.createCircleAnnotationManager();

    if (_victimLocation != null || _myLocation != null) {
      double lat = _victimLocation?.latitude ?? _myLocation?.latitude ?? 0;
      double lng = _victimLocation?.longitude ?? _myLocation?.longitude ?? 0;
      mapboxMap.setCamera(mapbox.CameraOptions(
        center: mapbox.Point(coordinates: mapbox.Position(lng, lat)),
        zoom: 15.0,
      ));
      if (_victimLocation != null) {
        _updateMarker();
      }
    }
  }

  @override
  void dispose() {
    _devicesSubscription?.cancel();
    super.dispose();
  }

  Future<void> _launchNavigation() async {
    if (_victimLocation == null) return;
    final url = 'https://www.google.com/maps/dir/?api=1&destination=${_victimLocation!.latitude},${_victimLocation!.longitude}&travelmode=walking';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorDeepGreen,
      appBar: AppBar(
        title: const Text("RESPONDER MODE"),
        backgroundColor: AppColors.colorSurface,
      ),
      body: _buildMapArea(),
    );
  }

  Widget _buildMapArea() {
    if (!_nearbyAlertActive) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.radar, size: 80, color: AppColors.colorMintGreen),
            const SizedBox(height: 20),
            Text(
              _alertMessage,
              style: const TextStyle(color: AppColors.colorTextMuted, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return Stack(
      children: [
        mapbox.MapWidget(
          key: const ValueKey("responderMapWidget"),
          onMapCreated: _onMapCreated,
          styleUri: mapbox.MapboxStyles.DARK,
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            margin: const EdgeInsets.all(20),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.colorDeepGreen,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.colorDanger, width: 2),
              boxShadow: [
                BoxShadow(color: AppColors.colorDanger.withValues(alpha: 0.5), blurRadius: 10, spreadRadius: 2),
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.warning_rounded, color: AppColors.colorDanger, size: 40),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("EMERGENCY NEARBY", style: TextStyle(color: AppColors.colorDanger, fontWeight: FontWeight.bold, fontSize: 18)),
                      Text("Someone needs help", style: TextStyle(color: AppColors.colorTextSecondary)),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: _launchNavigation,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.colorDanger),
                  child: const Text("NAVIGATE", style: TextStyle(color: Colors.white)),
                )
              ],
            ),
          ),
        )
      ],
    );
  }
}
