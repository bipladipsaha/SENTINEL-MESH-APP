import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class StaggeredListAnimation extends StatelessWidget {
  final int index;
  final Widget child;
  final Duration delay;

  const StaggeredListAnimation({
    super.key,
    required this.index,
    required this.child,
    this.delay = const Duration(milliseconds: 120),
  });

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return child;

    return Animate(
      delay: Duration(milliseconds: index * delay.inMilliseconds),
      effects: [
        FadeEffect(duration: 400.ms, curve: Curves.easeOutCubic),
        SlideEffect(
          begin: const Offset(0, 24 / 100),
          end: Offset.zero,
          duration: 400.ms,
          curve: Curves.easeOutCubic,
        ),
      ],
      child: child,
    );
  }
}
