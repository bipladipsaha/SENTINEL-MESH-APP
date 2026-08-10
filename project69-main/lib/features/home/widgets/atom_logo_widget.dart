import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AtomLogoWidget extends StatefulWidget {
  const AtomLogoWidget({super.key});

  @override
  State<AtomLogoWidget> createState() => _AtomLogoWidgetState();
}

class _AtomLogoWidgetState extends State<AtomLogoWidget> with TickerProviderStateMixin {
  late AnimationController _tealController;
  late AnimationController _redController;

  @override
  void initState() {
    super.initState();
    _tealController = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat();
    _redController = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();
  }

  @override
  void dispose() {
    _tealController.dispose();
    _redController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) {
       return _buildStaticLogo();
    }

    return SizedBox(
      width: 200,
      height: 200,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Ambient Halo
          Container(
            width: 180,
            height: 180,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppColors.atomHalo,
            ),
          ),

          // Teal Orbit
          AnimatedBuilder(
            animation: _tealController,
            builder: (context, child) {
              return Transform.rotate(
                angle: _tealController.value * 2 * math.pi,
                child: _buildOrbit(AppColors.colorAquaMint, true),
              );
            },
          ),

          // Red Orbit
          AnimatedBuilder(
            animation: _redController,
            builder: (context, child) {
              return Transform.rotate(
                angle: -_redController.value * 2 * math.pi,
                child: _buildOrbit(AppColors.colorDanger, false),
              );
            },
          ),

          // Center S
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.colorAquaMint.withValues(alpha: 0.3),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Center(
              child: Text(
                'S',
                style: AppTextStyles.displayLarge.copyWith(
                  color: AppColors.colorAquaMint,
                  fontSize: 40,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrbit(Color color, bool hasTwoDots) {
    return SizedBox(
      width: 160,
      height: 80,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
              borderRadius: const BorderRadius.all(Radius.elliptical(160, 80)),
            ),
          ),
          // Orbiting dots
          _buildDot(0, color),
          if (hasTwoDots) _buildDot(math.pi, color),
        ],
      ),
    );
  }

  Widget _buildDot(double angle, Color color) {
    // Parametric position for ellipse
    const double a = 80;
    const double b = 40;
    final double x = a + a * math.cos(angle) - 4;
    final double y = b + b * math.sin(angle) - 4;

    return Positioned(
      left: x,
      top: y,
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          boxShadow: [
            BoxShadow(color: color, blurRadius: 4, spreadRadius: 1),
          ],
        ),
      ),
    );
  }

  Widget _buildStaticLogo() {
     return const Icon(Icons.security, size: 100, color: AppColors.colorAquaMint);
  }
}
