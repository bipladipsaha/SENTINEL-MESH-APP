import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import 'widgets/radar_widget.dart';

class ResponderRadarScreen extends StatefulWidget {
  const ResponderRadarScreen({super.key});

  @override
  State<ResponderRadarScreen> createState() => _ResponderRadarScreenState();
}

class _ResponderRadarScreenState extends State<ResponderRadarScreen> {
  Position? _myLocation;
  LatLng? _victimLocation;
  bool _nearbyAlertActive = false;
  double _distanceToVictim = 0.0;
  StreamSubscription? _devicesSubscription;
  mapbox.MapboxMap? _mapboxMap;
  mapbox.CircleAnnotationManager? _circleAnnotationManager;

  @override
  void initState() {
    super.initState();
    _initGeofenceNetwork();
  }

  Future<void> _initGeofenceNetwork() async {
    try {
      _myLocation = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    } catch (_) {}

    _devicesSubscription = FirebaseDatabase.instance.ref('devices').onValue.listen((event) {
      if (event.snapshot.value == null) return;

      final Map<dynamic, dynamic> allDevices = event.snapshot.value as Map<dynamic, dynamic>;
      bool activeFound = false;
      Map<String, dynamic>? activeData;

      for (var val in allDevices.values) {
        final data = Map<String, dynamic>.from(val as Map);
        if (data['status'] == 'ACTIVE') {
          final int? ts = data['timestamp'] as int?;
          if (ts == null) continue;
          final age = DateTime.now().millisecondsSinceEpoch - ts;
          if (age < 0 || age > 300000) continue; // 5 min freshness

          activeData = data;
          activeFound = true;
          break;
        }
      }

      if (activeFound && activeData != null) {
        double? vLat = activeData['lat'] != null ? (activeData['lat'] as num).toDouble() : null;
        double? vLng = activeData['lng'] != null ? (activeData['lng'] as num).toDouble() : null;

        if (vLat != null && vLng != null && _myLocation != null) {
          double distance = Geolocator.distanceBetween(_myLocation!.latitude, _myLocation!.longitude, vLat, vLng);
          if (mounted) {
            setState(() {
              _nearbyAlertActive = true;
              _distanceToVictim = distance;
              _victimLocation = LatLng(vLat, vLng);
            });
            if (_victimLocation != null && _mapboxMap != null) {
              _mapboxMap!.setCamera(mapbox.CameraOptions(
                center: mapbox.Point(coordinates: mapbox.Position(vLng, vLat)),
                zoom: 15.0,
              ));
              _updateMarker();
            }
          }
        } else {
          if (mounted) setState(() { _nearbyAlertActive = true; _distanceToVictim = 0.0; });
        }
      } else {
        if (mounted) {
          setState(() {
            _nearbyAlertActive = false;
            _victimLocation = null;
          });
        }
      }
    });
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

  Future<void> _onMapCreated(mapbox.MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    _circleAnnotationManager = await mapboxMap.annotations.createCircleAnnotationManager();

    if (_victimLocation != null) {
      mapboxMap.setCamera(mapbox.CameraOptions(
        center: mapbox.Point(coordinates: mapbox.Position(_victimLocation!.longitude, _victimLocation!.latitude)),
        zoom: 15.0,
      ));
      _updateMarker();
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorDeepGreen,
      appBar: AppBar(
        title: const Text("RESPONDER RADAR"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: _nearbyAlertActive && _victimLocation != null
                ? _buildMap()
                : const RadarWidget(),
          ),
          Expanded(
            flex: 1,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: const BoxDecoration(
                color: AppColors.colorSurface,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(40),
                  topRight: Radius.circular(40),
                ),
              ),
              child: Column(
                children: [
                  Text(
                    _nearbyAlertActive ? "EMERGENCY DETECTED" : "SCANNING SECTORS",
                    style: AppTextStyles.displayMedium.copyWith(
                      color: _nearbyAlertActive ? AppColors.colorDanger : AppColors.colorMintGreen,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_nearbyAlertActive) ...[
                    Text(
                      _distanceToVictim > 0 ? "${_distanceToVictim.toStringAsFixed(0)} meters away" : "Location tracking…",
                      style: AppTextStyles.bodyMedium.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _launchNavigation,
                      icon: const Icon(Icons.navigation_rounded),
                      label: const Text("NAVIGATE"),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.colorDanger, foregroundColor: Colors.white),
                    )
                  ] else ...[
                    Text(
                      "All sectors clear. You are a designated community responder. Stay alert.",
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMap() {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppColors.colorDanger.withValues(alpha: 0.3), width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: mapbox.MapWidget(
          key: const ValueKey("radarMapWidget"),
          onMapCreated: _onMapCreated,
          styleUri: mapbox.MapboxStyles.DARK,
        ),
      ),
    );
  }
}
