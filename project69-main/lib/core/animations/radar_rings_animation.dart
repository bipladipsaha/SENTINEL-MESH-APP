import 'package:flutter/material.dart';

class RadarRingsAnimation extends StatefulWidget {
  final Color ringColor;
  const RadarRingsAnimation({super.key, required this.ringColor});

  @override
  State<RadarRingsAnimation> createState() => _RadarRingsAnimationState();
}

class _RadarRingsAnimationState extends State<RadarRingsAnimation> with TickerProviderStateMixin {
  late List<AnimationController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(3, (index) {
      return AnimationController(vsync: this, duration: const Duration(milliseconds: 2400));
    });

    for (int i = 0; i < 3; i++) {
      Future.delayed(Duration(milliseconds: i * 800), () {
        if (mounted) _controllers[i].repeat();
      });
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return const SizedBox.shrink();

    return Stack(
      alignment: Alignment.center,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controllers[index],
          builder: (context, child) {
            final scale = Tween<double>(begin: 1.0, end: 3.5).evaluate(_controllers[index]);
            final opacity = Tween<double>(begin: 0.6, end: 0.0).evaluate(_controllers[index]);

            return Transform.scale(
              scale: scale,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: widget.ringColor.withValues(alpha: opacity), width: 1.5),
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
