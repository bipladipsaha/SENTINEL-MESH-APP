import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class FallDetectionToggle extends StatefulWidget {
  final bool initialValue;
  final ValueChanged<bool> onChanged;

  const FallDetectionToggle({
    super.key,
    required this.initialValue,
    required this.onChanged,
  });

  @override
  State<FallDetectionToggle> createState() => _FallDetectionToggleState();
}

class _FallDetectionToggleState extends State<FallDetectionToggle> {
  late bool _isOn;

  @override
  void initState() {
    super.initState();
    _isOn = widget.initialValue;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.colorSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _isOn ? AppColors.colorAquaMint.withValues(alpha: 0.4) : AppColors.colorBorder,
          width: _isOn ? 1.5 : 1.0,
        ),
        boxShadow: _isOn ? [
          BoxShadow(
            color: AppColors.colorAquaMint.withValues(alpha: 0.1),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ] : [],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                _isOn ? Icons.health_and_safety : Icons.health_and_safety_outlined,
                color: _isOn ? AppColors.colorAquaMint : AppColors.colorTextMuted,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("FALL DETECTION", style: AppTextStyles.labelLarge.copyWith(fontSize: 14)),
                  Text(
                    _isOn ? "AI monitoring active" : "Disabled",
                    style: AppTextStyles.bodySmall,
                  ),
                ],
              ),
            ],
          ),
          Switch(
            value: _isOn,
            onChanged: (value) {
              setState(() => _isOn = value);
              widget.onChanged(value);
            },
            activeTrackColor: AppColors.colorAquaMint.withValues(alpha: 0.2),
            activeThumbColor: AppColors.colorAquaMint,
          ),
        ],
      ),
    );
  }
}
