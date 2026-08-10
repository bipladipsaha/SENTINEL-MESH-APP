import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class EmergencySupportRow extends StatelessWidget {
  final VoidCallback onPoliceTap;
  final VoidCallback onMedicalTap;

  const EmergencySupportRow({
    super.key,
    required this.onPoliceTap,
    required this.onMedicalTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SupportButton(
            label: 'POLICE',
            icon: Icons.local_police,
            color: AppColors.colorMintGreen,
            onTap: onPoliceTap,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _SupportButton(
            label: 'MEDICAL',
            icon: Icons.medical_services,
            color: AppColors.colorDanger,
            onTap: onMedicalTap,
          ),
        ),
      ],
    );
  }
}

class _SupportButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _SupportButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: AppColors.colorSurfaceAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: AppTextStyles.labelMedium.copyWith(color: color, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
