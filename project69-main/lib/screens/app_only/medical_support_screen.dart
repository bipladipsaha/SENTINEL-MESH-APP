import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/constants/api_keys.dart';
import '../../services/places_service.dart';

class MedicalSupportScreen extends StatefulWidget {
  const MedicalSupportScreen({super.key});

  @override
  State<MedicalSupportScreen> createState() => _MedicalSupportScreenState();
}

class _MedicalSupportScreenState extends State<MedicalSupportScreen> {
  mapbox.MapboxMap? _mapboxMap;
  mapbox.CircleAnnotationManager? _circleAnnotationManager;
  mapbox.PolylineAnnotationManager? _polylineAnnotationManager;

  LatLng? _currentLocation;
  List<dynamic> _hospitals = [];
  bool _isLoading = true;
  List<LatLng> _navigationRoute = [];
  StreamSubscription<Position>? _positionStream;

  @override
  void initState() {
    super.initState();
    _fetchPlaces();
    _startLocationUpdates();
  }

  void _startLocationUpdates() {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 5),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
          if (_navigationRoute.isNotEmpty) {
            _navigationRoute[0] = _currentLocation!; // Update start of line
            _updateRouteOnMap();
          }
          _updateMarkers();
          
          if (_mapboxMap != null) {
            _mapboxMap!.setCamera(mapbox.CameraOptions(
              center: mapbox.Point(coordinates: mapbox.Position(_currentLocation!.longitude, _currentLocation!.latitude)),
            ));
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    super.dispose();
  }

  Future<void> _fetchPlaces() async {
    try {
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      setState(() => _currentLocation = LatLng(pos.latitude, pos.longitude));

      final results = await PlacesService.getNearbyHospitals(pos.latitude, pos.longitude);
      setState(() {
        _hospitals = results;
        _isLoading = false;
      });

      if (_currentLocation != null && _mapboxMap != null) {
        _mapboxMap!.setCamera(mapbox.CameraOptions(
          center: mapbox.Point(coordinates: mapbox.Position(_currentLocation!.longitude, _currentLocation!.latitude)),
          zoom: 14.0,
        ));
      }
      _updateMarkers();
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _onMapCreated(mapbox.MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    final annotationPlugin = mapboxMap.annotations;
    _circleAnnotationManager = await annotationPlugin.createCircleAnnotationManager();
    _polylineAnnotationManager = await annotationPlugin.createPolylineAnnotationManager();

    if (_currentLocation != null) {
      mapboxMap.setCamera(mapbox.CameraOptions(
        center: mapbox.Point(coordinates: mapbox.Position(_currentLocation!.longitude, _currentLocation!.latitude)),
        zoom: 14.0,
      ));
    }
    
    _updateMarkers();
    _updateRouteOnMap();
  }

  void _updateMarkers() {
    if (_circleAnnotationManager == null) return;
    _circleAnnotationManager!.deleteAll();

    List<mapbox.CircleAnnotationOptions> options = [];

    // Add hospitals
    for (var place in _hospitals) {
      options.add(mapbox.CircleAnnotationOptions(
        geometry: mapbox.Point(coordinates: mapbox.Position(place['geometry']['location']['lng'], place['geometry']['location']['lat'])),
        circleColor: AppColors.colorDanger.value,
        circleRadius: 8.0,
        circleStrokeWidth: 2.0,
        circleStrokeColor: Colors.white.value,
      ));
    }

    // Add current location
    if (_currentLocation != null) {
      options.add(mapbox.CircleAnnotationOptions(
        geometry: mapbox.Point(coordinates: mapbox.Position(_currentLocation!.longitude, _currentLocation!.latitude)),
        circleColor: Colors.blue.value,
        circleRadius: 10.0,
        circleStrokeWidth: 3.0,
        circleStrokeColor: Colors.white.value,
      ));
    }

    _circleAnnotationManager!.createMulti(options);
  }

  void _updateRouteOnMap() {
    if (_polylineAnnotationManager == null) return;
    _polylineAnnotationManager!.deleteAll();

    if (_navigationRoute.length >= 2) {
      List<mapbox.Position> positions = _navigationRoute.map((latlng) => mapbox.Position(latlng.longitude, latlng.latitude)).toList();
      _polylineAnnotationManager!.create(mapbox.PolylineAnnotationOptions(
        geometry: mapbox.LineString(coordinates: positions),
        lineColor: Colors.blueAccent.value,
        lineWidth: 6.0,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorDeepGreen,
      appBar: AppBar(
        title: const Text("MEDICAL SUPPORT"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // Map Background
          if (_currentLocation != null)
            Positioned.fill(
              child: mapbox.MapWidget(
                key: const ValueKey("mapWidget"),
                onMapCreated: _onMapCreated,
                styleUri: mapbox.MapboxStyles.DARK,
              ),
            )
          else
            const Center(child: CircularProgressIndicator(color: AppColors.colorDanger)),

          // Foreground Content
          SafeArea(
            child: Column(
              children: [
                // Search Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.colorSurfaceAlt,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.colorBorder),
                    ),
                    child: const TextField(
                      style: TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Search hospitals...',
                        hintStyle: TextStyle(color: AppColors.colorTextMuted),
                        prefixIcon: Icon(Icons.search, color: AppColors.colorTextMuted),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                ),

                const Spacer(),

                // Emergency Direct Header
                GestureDetector(
                  onTap: () => launchUrl(Uri.parse('tel:108')),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.colorDanger.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.colorDanger.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppColors.colorDanger,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.call, color: Colors.white, size: 16),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('EMERGENCY DIRECT', style: AppTextStyles.captionTech.copyWith(color: AppColors.colorDanger)),
                                Text('108', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Nearby Facilities Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      Text('Nearby Facilities', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                      const Spacer(),
                      if (!_isLoading)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.colorSurfaceAlt,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.colorBorder),
                          ),
                          child: Text('${_hospitals.length} Found', style: AppTextStyles.captionTech),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // List of Hospitals
                Container(
                  height: 220,
                  margin: const EdgeInsets.only(bottom: 24),
                  child: _isLoading
                    ? _buildSkeletonList()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        scrollDirection: Axis.horizontal,
                        itemCount: _hospitals.length,
                        itemBuilder: (context, index) => _buildPlaceCard(_hospitals[index]),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      scrollDirection: Axis.horizontal,
      itemCount: 3,
      itemBuilder: (context, index) => Container(
        width: 300,
        margin: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(color: AppColors.colorSurface.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(28)),
      ),
    );
  }

  Widget _buildPlaceCard(dynamic place) {
    double distanceInMeters = const Distance().as(
      LengthUnit.Meter,
      _currentLocation!,
      LatLng(place['geometry']['location']['lat'], place['geometry']['location']['lng']),
    );
    final String distanceText = "${(distanceInMeters / 1000).toStringAsFixed(1)} km";
    final String address = place['vicinity'] ?? 'Address unavailable';

    return Container(
      width: 320,
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(place['name'], style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Text(address, style: AppTextStyles.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.colorAquaMint.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('OPEN 24/7', style: AppTextStyles.captionTech.copyWith(color: AppColors.colorAquaMint, fontSize: 9)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.location_on, color: AppColors.colorDanger, size: 14),
              const SizedBox(width: 4),
              Text(distanceText, style: AppTextStyles.captionTech.copyWith(color: AppColors.colorDanger)),
              const Spacer(),
              const Icon(Icons.phone, color: AppColors.colorTextMuted, size: 14),
              const SizedBox(width: 4),
              Text('+1 555-0199', style: AppTextStyles.captionTech), 
            ],
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _launchNav(place['geometry']['location']['lat'], place['geometry']['location']['lng']),
                  icon: const Icon(Icons.navigation, size: 16),
                  label: const Text("Navigate", style: const TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.colorAquaMint,
                    foregroundColor: AppColors.colorDeepGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    final phone = place['phone'] ?? '108';
                    launchUrl(Uri.parse('tel:$phone'));
                  },
                  icon: const Icon(Icons.call, size: 16),
                  label: const Text("Call", style: const TextStyle(fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: AppColors.colorBorder),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _launchNav(double lat, double lng) async {
    if (_currentLocation == null) return;
    setState(() {
      _navigationRoute = [_currentLocation!, LatLng(lat, lng)];
    });
    
    _updateRouteOnMap();

    try {
      final dio = Dio();
      final url = 'https://api.mapbox.com/directions/v5/mapbox/driving/${_currentLocation!.longitude},${_currentLocation!.latitude};$lng,$lat?geometries=geojson&access_token=${ApiKeys.mapboxPublicToken}';
      final response = await dio.get(url);
      
      if (response.statusCode == 200) {
        final data = response.data;
        if (data['routes'] != null && data['routes'].isNotEmpty) {
          final geometry = data['routes'][0]['geometry']['coordinates'] as List;
          final List<LatLng> routePoints = geometry.map((coord) => LatLng(coord[1] as double, coord[0] as double)).toList();
          if (mounted) {
            setState(() {
              _navigationRoute = routePoints;
            });
            _updateRouteOnMap();
          }
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offline mode: Showing direct path to destination.'),
            backgroundColor: AppColors.colorDanger,
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }
}
