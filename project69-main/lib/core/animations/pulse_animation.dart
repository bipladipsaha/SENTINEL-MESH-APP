import 'package:flutter/material.dart';

class PulseAnimation extends StatefulWidget {
  final Widget child;
  final Color color;
  final double scaleStart;
  final double scaleEnd;
  final Duration duration;

  const PulseAnimation({
    super.key,
    required this.child,
    required this.color,
    this.scaleStart = 1.0,
    this.scaleEnd = 1.8,
    this.duration = const Duration(milliseconds: 1500),
  });

  @override
  State<PulseAnimation> createState() => _PulseAnimationState();
}

class _PulseAnimationState extends State<PulseAnimation> with TickerProviderStateMixin {
  late AnimationController _controller1;
  late AnimationController _controller2;

  @override
  void initState() {
    super.initState();
    _controller1 = AnimationController(vsync: this, duration: widget.duration)..repeat();
    _controller2 = AnimationController(vsync: this, duration: widget.duration);

    Future.delayed(Duration(milliseconds: widget.duration.inMilliseconds ~/ 2), () {
      if (mounted) _controller2.repeat();
    });
  }

  @override
  void dispose() {
    _controller1.dispose();
    _controller2.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return widget.child;

    return Stack(
      alignment: Alignment.center,
      children: [
        _buildRing(_controller1),
        _buildRing(_controller2),
        widget.child,
      ],
    );
  }

  Widget _buildRing(AnimationController controller) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final scale = Tween<double>(begin: widget.scaleStart, end: widget.scaleEnd).evaluate(controller);
        final opacity = Tween<double>(begin: 0.4, end: 0.0).evaluate(controller);

        return Transform.scale(
          scale: scale,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: widget.color.withValues(alpha: opacity), width: 2),
            ),
          ),
        );
      },
    );
  }
}
