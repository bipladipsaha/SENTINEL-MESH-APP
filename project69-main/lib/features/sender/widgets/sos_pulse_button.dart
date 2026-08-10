import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/animations/pulse_animation.dart';

class SOSPulseButton extends StatefulWidget {
  final VoidCallback onTrigger;
  final bool isRecording;
  const SOSPulseButton({super.key, required this.onTrigger, this.isRecording = false});

  @override
  State<SOSPulseButton> createState() => _SOSPulseButtonState();
}

class _SOSPulseButtonState extends State<SOSPulseButton> with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;
  bool _isLongPressing = false;
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      lowerBound: 0.9,
      upperBound: 1.05,
      value: 1.0,
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    setState(() => _isLongPressing = true);
    _scaleController.animateTo(0.9);
    HapticFeedback.mediumImpact();
  }

  void _handleTapUp(TapUpDetails details) {
    if (_progress < 1.0) {
      if (widget.isRecording) {
        // Stop recording immediately without dialog
        _reset();
        widget.onTrigger();
      } else {
        // Show confirmation only when STARTING SOS
        _reset();
        _showConfirmationDialog();
      }
    }
  }

  void _handleTapCancel() => _reset();

  void _reset() {
    setState(() {
      _isLongPressing = false;
      _progress = 0.0;
    });
    _scaleController.animateTo(1.0);
  }

  void _showConfirmationDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.colorSurface,
        title: Text("Trigger SOS?", style: AppTextStyles.displayMedium),
        content: Text("Are you sure you want to broadcast an emergency alert?", style: AppTextStyles.bodyMedium),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("CANCEL")),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              widget.onTrigger();
            },
            child: const Text("TRIGGER", style: TextStyle(color: AppColors.colorDanger)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onLongPressStart: (_) => setState(() => _isLongPressing = true),
      onLongPressEnd: (_) => _reset(),
      child: PulseAnimation(
        color: AppColors.colorDanger,
        child: ScaleTransition(
          scale: _scaleController,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Radial Glow
              Container(
                width: 160,
                height: 160,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.sosRadialGlow,
                ),
              ),
              // Background Ring
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.colorDangerMuted,
                  border: Border.all(color: AppColors.colorDanger.withValues(alpha: 0.3), width: 2),
                ),
              ),
              // Progress Indicator
              if (_isLongPressing)
                SizedBox(
                  width: 150,
                  height: 150,
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.0, end: 1.0),
                    duration: const Duration(seconds: 3),
                    builder: (context, value, child) {
                      _progress = value;
                      if (value >= 1.0 && _isLongPressing) {
                         WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (_isLongPressing) {
                               _reset();
                               widget.onTrigger();
                            }
                         });
                      }
                      return CircularProgressIndicator(
                        value: value,
                        strokeWidth: 4,
                        color: AppColors.colorDanger,
                        backgroundColor: Colors.transparent,
                      );
                    },
                  ),
                ),
              // Main Button
              Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.colorDanger,
                ),
                child: Center(
                  child: Text(
                    widget.isRecording ? "STOP" : "SOS",
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
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
