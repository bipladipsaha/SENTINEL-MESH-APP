import 'dart:math' as math;
import 'package:flutter/material.dart';

class SentinelLogo extends StatefulWidget {
  final double size;
  const SentinelLogo({super.key, this.size = 200});

  @override
  State<SentinelLogo> createState() => _SentinelLogoState();
}

class _SentinelLogoState extends State<SentinelLogo> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    // Controls the speed of the orbiting particles
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size(widget.size, widget.size),
          painter: SentinelLogoPainter(progress: _controller.value),
        );
      },
    );
  }
}

class SentinelLogoPainter extends CustomPainter {
  final double progress;

  SentinelLogoPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // --- Colors matching the provided snippet ---
    final neonBlue = const Color(0xFF00E5FF);
    final neonRed = const Color(0xFFFF3D00);

    // --- Paints ---
    final blueOrbitPaint = Paint()
      ..color = neonBlue.withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.solid, 3); // Glow effect

    final redOrbitPaint = Paint()
      ..color = neonRed.withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.solid, 3);

    final coreGlowPaint = Paint()
      ..color = neonBlue.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 15);

    // --- Draw Central Core Glow ---
    canvas.drawCircle(center, radius * 0.25, coreGlowPaint);

    // Draw the "S" placeholder in the center
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'S',
        style: TextStyle(
          color: Colors.white,
          fontSize: size.width * 0.4,
          fontWeight: FontWeight.bold,
          fontStyle: FontStyle.italic,
          shadows: [Shadow(color: neonBlue, blurRadius: 10)],
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(center.dx - (textPainter.width / 2), center.dy - (textPainter.height / 2)),
    );

    // --- Helper function to draw orbits and particles ---
    void drawOrbitAndParticle(Paint orbitPaint, Color particleColor, double angle, bool reverse) {
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(angle);

      // The shape of the orbit (an oval)
      final rect = Rect.fromCenter(center: Offset.zero, width: size.width * 0.9, height: size.height * 0.35);
      canvas.drawOval(rect, orbitPaint);

      // Calculate particle position
      // Using math.pi * 2 to do a full circle based on the animation progress
      final currentAngle = (reverse ? (1 - progress) : progress) * math.pi * 2;

      // Parametric equation for an ellipse
      final particleX = (rect.width / 2) * math.cos(currentAngle);
      final particleY = (rect.height / 2) * math.sin(currentAngle);

      // Draw the glowing particle
      final particlePaint = Paint()
        ..color = particleColor
        ..style = PaintingStyle.fill
        ..maskFilter = const MaskFilter.blur(BlurStyle.solid, 5);

      final innerParticlePaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(particleX, particleY), 6, particlePaint);
      canvas.drawCircle(Offset(particleX, particleY), 2, innerParticlePaint);

      canvas.restore();
    }

    // --- Draw the intersecting orbits ---
    // Blue orbit tilted one way
    drawOrbitAndParticle(blueOrbitPaint, neonBlue, math.pi / 4, false);

    // Red orbit tilted the other way
    drawOrbitAndParticle(redOrbitPaint, neonRed, -math.pi / 4, true);

    // Third orbit (horizontal)
    drawOrbitAndParticle(blueOrbitPaint, neonBlue.withValues(alpha: 0.8), 0, false);
  }

  @override
  bool shouldRepaint(covariant SentinelLogoPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
