import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../responder/active_response_screen.dart';

class LiveTrackerDetailScreen extends StatefulWidget {
  final String deviceId;
  final double lat;
  final double lng;
  
  const LiveTrackerDetailScreen({
    super.key,
    this.deviceId = 'SM-8842',
    this.lat = 40.7128,
    this.lng = -74.0060,
  });

  @override
  State<LiveTrackerDetailScreen> createState() => _LiveTrackerDetailScreenState();
}

class _LiveTrackerDetailScreenState extends State<LiveTrackerDetailScreen> {
  mapbox.MapboxMap? _mapboxMap;
  mapbox.CircleAnnotationManager? _circleAnnotationManager;

  Future<void> _onMapCreated(mapbox.MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    _circleAnnotationManager = await mapboxMap.annotations.createCircleAnnotationManager();

    mapboxMap.setCamera(mapbox.CameraOptions(
      center: mapbox.Point(coordinates: mapbox.Position(widget.lng, widget.lat)),
      zoom: 15.0,
    ));

    _circleAnnotationManager!.create(mapbox.CircleAnnotationOptions(
      geometry: mapbox.Point(coordinates: mapbox.Position(widget.lng, widget.lat)),
      circleColor: AppColors.colorDanger.value,
      circleRadius: 10.0,
      circleStrokeWidth: 3.0,
      circleStrokeColor: Colors.white.value,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Tracker'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Map
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: SizedBox(
                  height: 250,
                  child: Stack(
                    children: [
                      mapbox.MapWidget(
                        key: const ValueKey("liveTrackerMap"),
                        onMapCreated: _onMapCreated,
                        styleUri: mapbox.MapboxStyles.DARK,
                      ),
                      Positioned(
                        top: 16,
                        left: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.colorDanger,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
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
                                'LIVE TRACKING ACTIVE',
                                style: AppTextStyles.captionTech.copyWith(color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Critical Alert Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.colorDanger.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.warning_amber_rounded, color: AppColors.colorDanger, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('CRITICAL ALERT', style: AppTextStyles.captionTech.copyWith(color: AppColors.colorDanger, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text('Medical Emergency Reported', style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 18)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.colorSurfaceAlt,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.colorBorder),
                    ),
                    child: Text('02:45', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorDanger)),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Metrics Grid
              Row(
                children: [
                  _buildMetricBox('Device', widget.deviceId, Icons.watch, AppColors.colorAquaMint),
                  const SizedBox(width: 12),
                  _buildMetricBox('Battery', '15%', Icons.battery_alert, AppColors.colorDanger),
                  const SizedBox(width: 12),
                  _buildMetricBox('Dist', '850m', Icons.social_distance, AppColors.colorMintGreen),
                ],
              ),
              const SizedBox(height: 16),

              // Location Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.colorSurfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.colorBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.location_on, color: AppColors.colorAquaMint, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('123 Central Park West, NY', style: AppTextStyles.bodyMedium.copyWith(color: Colors.white)),
                          const SizedBox(height: 2),
                          Text('Precision: High (±5m) • Updated 10s ago', style: AppTextStyles.captionTech),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Incident Tags
              Text('INCIDENT INFORMATION', style: AppTextStyles.captionTech),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildTag('High Pulse Detection', AppColors.colorDanger),
                  _buildTag('Sudden Fall', AppColors.colorDanger),
                  _buildTag('No Movement', AppColors.colorAquaMint),
                ],
              ),
              const SizedBox(height: 24),

              // AI Summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.colorMintGreen.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border(
                    top: BorderSide(color: AppColors.colorMintGreen.withValues(alpha: 0.3)),
                    right: BorderSide(color: AppColors.colorMintGreen.withValues(alpha: 0.3)),
                    bottom: BorderSide(color: AppColors.colorMintGreen.withValues(alpha: 0.3)),
                    left: const BorderSide(color: AppColors.colorMintGreen, width: 4),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome, color: AppColors.colorMintGreen, size: 16),
                        const SizedBox(width: 8),
                        Text('AI INCIDENT SUMMARY', style: AppTextStyles.captionTech.copyWith(color: AppColors.colorMintGreen)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '"User experienced a sudden fall followed by an abnormal heart rate spike to 140 BPM. No movement detected for the past 2 minutes. High probability of medical emergency."',
                      style: AppTextStyles.bodySmall.copyWith(fontStyle: FontStyle.italic, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      onPressed: () {
                        final url = 'https://www.google.com/maps/dir/?api=1&destination=${widget.lat},${widget.lng}';
                        launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.colorAquaMint,
                        side: const BorderSide(color: AppColors.colorAquaMint),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Navigate', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const ActiveResponseScreen()));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.colorAquaMint,
                        foregroundColor: AppColors.colorDeepGreen,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Respond', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Mark as False Alarm',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorTextMuted),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricBox(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.colorSurfaceAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.colorBorder),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 8),
            Text(value, style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 16)),
            const SizedBox(height: 2),
            Text(label, style: AppTextStyles.captionTech),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(text, style: AppTextStyles.captionTech.copyWith(color: color)),
    );
  }
}
