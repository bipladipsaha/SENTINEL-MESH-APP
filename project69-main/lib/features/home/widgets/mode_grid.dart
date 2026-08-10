import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/animations/staggered_list_animation.dart';

class ModeGrid extends StatelessWidget {
  final VoidCallback onSenderTap;
  final VoidCallback onResponderTap;

  const ModeGrid({
    super.key,
    required this.onSenderTap,
    required this.onResponderTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: StaggeredListAnimation(
            index: 3,
            child: _ModeCard(
              title: 'SENDER',
              subtitle: 'VICTIM MODE',
              icon: Icons.sos,
              color: AppColors.colorDanger,
              onTap: onSenderTap,
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: StaggeredListAnimation(
            index: 4,
            child: _ModeCard(
              title: 'RESPONDER',
              subtitle: 'COMMUNITY',
              icon: Icons.radar,
              color: AppColors.colorMintGreen,
              onTap: onResponderTap,
            ),
          ),
        ),
      ],
    );
  }
}

class _ModeCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ModeCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 160,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.colorSurface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.colorBorder),
          gradient: AppColors.cardGradient,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const Spacer(),
            Text(
              title,
              style: AppTextStyles.labelLarge.copyWith(color: color, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: AppTextStyles.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
