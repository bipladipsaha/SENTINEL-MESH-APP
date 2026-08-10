import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class ActiveResponseScreen extends StatefulWidget {
  final String victimName;
  final String victimDistance;
  final String victimEta;
  final double victimLat;
  final double victimLng;

  const ActiveResponseScreen({
    super.key,
    this.victimName = 'Elena Rodriguez',
    this.victimDistance = '850',
    this.victimEta = '4',
    this.victimLat = 40.7128,
    this.victimLng = -74.0060,
  });

  @override
  State<ActiveResponseScreen> createState() => _ActiveResponseScreenState();
}

class _ActiveResponseScreenState extends State<ActiveResponseScreen> {
  mapbox.MapboxMap? _mapboxMap;
  mapbox.CircleAnnotationManager? _circleAnnotationManager;

  @override
  void initState() {
    super.initState();
  }

  Future<void> _onMapCreated(mapbox.MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    _circleAnnotationManager = await mapboxMap.annotations.createCircleAnnotationManager();

    mapboxMap.setCamera(mapbox.CameraOptions(
      center: mapbox.Point(coordinates: mapbox.Position(widget.victimLng, widget.victimLat)),
      zoom: 15.0,
    ));

    _circleAnnotationManager!.create(mapbox.CircleAnnotationOptions(
      geometry: mapbox.Point(coordinates: mapbox.Position(widget.victimLng, widget.victimLat)),
      circleColor: AppColors.colorDanger.value,
      circleRadius: 10.0,
      circleStrokeWidth: 3.0,
      circleStrokeColor: Colors.white.value,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Sentinel', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorAquaMint)),
                        Text('Mesh', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorAquaMint)),
                      ],
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.colorDanger,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'ACTIVE RESPONSE',
                            style: AppTextStyles.captionTech.copyWith(color: Colors.white, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Victim info card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.colorSurfaceAlt,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.colorBorder),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                const CircleAvatar(
                                  radius: 28,
                                  backgroundColor: AppColors.colorSurface,
                                  child: Icon(Icons.person, color: AppColors.colorMintGreen, size: 28),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('RESPONDING TO', style: AppTextStyles.captionTech.copyWith(fontSize: 10)),
                                      const SizedBox(height: 4),
                                      Text(widget.victimName, style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 18)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: const BoxDecoration(
                                    color: AppColors.colorAquaMint,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.call, color: AppColors.colorDeepGreen, size: 20),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    decoration: BoxDecoration(
                                      color: AppColors.colorSurface,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.colorBorder),
                                    ),
                                    child: Column(
                                      children: [
                                        Text('Victim Distance', style: AppTextStyles.bodySmall),
                                        const SizedBox(height: 4),
                                        RichText(
                                          text: TextSpan(
                                            children: [
                                              TextSpan(
                                                text: widget.victimDistance,
                                                style: AppTextStyles.displayLarge.copyWith(fontSize: 32),
                                              ),
                                              TextSpan(
                                                text: ' m',
                                                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorDanger),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    decoration: BoxDecoration(
                                      color: AppColors.colorSurface,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.colorBorder),
                                    ),
                                    child: Column(
                                      children: [
                                        Text('ETA', style: AppTextStyles.bodySmall),
                                        const SizedBox(height: 4),
                                        RichText(
                                          text: TextSpan(
                                            children: [
                                              TextSpan(
                                                text: widget.victimEta,
                                                style: AppTextStyles.displayLarge.copyWith(fontSize: 32, color: AppColors.colorAquaMint),
                                              ),
                                              TextSpan(
                                                text: ' min',
                                                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorAquaMint),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Map
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          height: 250,
                          child: mapbox.MapWidget(
                            key: const ValueKey("activeResponseMap"),
                            onMapCreated: _onMapCreated,
                            styleUri: mapbox.MapboxStyles.DARK,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Next Turn hint
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.colorSurfaceAlt,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.colorBorder),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.navigation, color: AppColors.colorAquaMint, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Next Turn', style: AppTextStyles.bodySmall),
                                  Text('Turn left on Harrison St.', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Navigate button
                      ElevatedButton.icon(
                        onPressed: () {
                          final url = 'https://www.google.com/maps/dir/?api=1&destination=${widget.victimLat},${widget.victimLng}';
                          launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                        },
                        icon: const Icon(Icons.navigation, size: 20),
                        label: const Text('Navigate', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.colorAquaMint,
                          foregroundColor: AppColors.colorDeepGreen,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: const StadiumBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Services + Team buttons
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.local_hospital, size: 18, color: AppColors.colorDanger),
                              label: Text('Services', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.colorBorder),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: const StadiumBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.people, size: 18, color: AppColors.colorAquaMint),
                              label: Text('Team', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.colorBorder),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: const StadiumBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
