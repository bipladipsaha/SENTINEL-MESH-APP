import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/animations/radar_rings_animation.dart';

class RadarWidget extends StatefulWidget {
  const RadarWidget({super.key});

  @override
  State<RadarWidget> createState() => _RadarWidgetState();
}

class _RadarWidgetState extends State<RadarWidget> with SingleTickerProviderStateMixin {
  late AnimationController _iconPulseController;

  @override
  void initState() {
    super.initState();
    _iconPulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _iconPulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Bloom
          Container(
            width: 300,
            height: 300,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppColors.radarGlow,
            ),
          ),

          // Expanding Rings
          const RadarRingsAnimation(ringColor: AppColors.colorAquaMint),

          // Center Icon
          ScaleTransition(
            scale: Tween<double>(begin: 1.0, end: 1.08).animate(
              CurvedAnimation(parent: _iconPulseController, curve: Curves.easeInOut),
            ),
            child: Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: AppColors.colorDeepGreen,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.colorAquaMint.withValues(alpha: 0.3), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.colorAquaMint.withValues(alpha: 0.2),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Icon(
                Icons.radar_rounded,
                size: 60,
                color: AppColors.colorAquaMint,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
