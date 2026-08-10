import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class SosCountdownScreen extends StatefulWidget {
  const SosCountdownScreen({super.key});

  @override
  State<SosCountdownScreen> createState() => _SosCountdownScreenState();
}

class _SosCountdownScreenState extends State<SosCountdownScreen>
    with SingleTickerProviderStateMixin {
  int _countdown = 15;
  Timer? _timer;
  late AnimationController _progressController;
  String _currentAddress = 'Fetching location...';
  String _accuracy = '';

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..forward();

    _startCountdown();
    _fetchLocation();
  }

  void _startCountdown() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown <= 1) {
        timer.cancel();
        context.pushReplacement('/sender?auto_start=true');
        return;
      }
      if (mounted) {
        setState(() => _countdown--);
      }
    });
  }

  Future<void> _fetchLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (mounted) {
        setState(() {
          _currentAddress = '${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}';
          _accuracy = 'Accuracy: High (within ${pos.accuracy.toStringAsFixed(0)}m)';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _currentAddress = 'Location unavailable';
          _accuracy = '';
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _progressController.dispose();
    super.dispose();
  }

  void _cancelSos() {
    _timer?.cancel();
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              children: [
                // Header
                Row(
                  children: [
                    const Icon(Icons.shield, color: AppColors.colorAquaMint, size: 28),
                    const SizedBox(width: 8),
                    Text('Sentinel Mesh', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorAquaMint)),
                    const Spacer(),
                    const CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.colorSurfaceAlt,
                      child: Icon(Icons.person, color: AppColors.colorMintGreen, size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Emergency banner
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.colorDanger,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.emergency, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'POTENTIAL EMERGENCY DETECTED',
                          style: AppTextStyles.captionTech.copyWith(color: Colors.white, fontSize: 12, letterSpacing: 1),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Title
                Text(
                  'Emergency detected.\nSending in...',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.displayLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Your coordinates and medical profile will be shared with the mesh response network.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMedium,
                ),

                const SizedBox(height: 16),

                // Countdown circle
                SizedBox(
                  width: 200,
                  height: 200,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      AnimatedBuilder(
                        animation: _progressController,
                        builder: (context, child) {
                          return SizedBox(
                            width: 200,
                            height: 200,
                            child: CircularProgressIndicator(
                              value: 1.0 - _progressController.value,
                              strokeWidth: 8,
                              backgroundColor: AppColors.colorSurface,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.colorDanger),
                            ),
                          );
                        },
                      ),
                      Text(
                        '$_countdown',
                        style: AppTextStyles.displayLarge.copyWith(
                          color: AppColors.colorDanger,
                          fontSize: 64,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Current Location card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.colorSurfaceAlt,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.colorBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.colorAquaMint.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.location_on, color: AppColors.colorAquaMint),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Current Location', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                            const SizedBox(height: 4),
                            Text(_currentAddress, style: AppTextStyles.bodySmall),
                            if (_accuracy.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(_accuracy, style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorTextMuted)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Cancel button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _cancelSos,
                    icon: const Icon(Icons.close, size: 20),
                    label: const Text('Cancel', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.colorSurfaceAlt,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: const StadiumBorder(),
                      side: const BorderSide(color: AppColors.colorBorder),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'If you do not cancel, help will be dispatched automatically.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorTextMuted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
