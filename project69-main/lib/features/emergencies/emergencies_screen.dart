import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class EmergenciesScreen extends StatelessWidget {
  const EmergenciesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergencies'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: AppColors.colorMintGreen),
            onPressed: () => context.push('/emergencies/history'),
          ),
        ],
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 88),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Smart Safety Protocol', style: AppTextStyles.displayMedium),
              const SizedBox(height: 8),
              Text(
                'Contacts are reached via SMS, Call, and App notification simultaneously during an emergency.',
                style: AppTextStyles.bodyMedium,
              ),
              const SizedBox(height: 32),
              _buildProtocolBanner(),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('EMERGENCY CONTACTS', style: AppTextStyles.captionTech),
                ],
              ),
              const SizedBox(height: 16),
              _buildContactCard('Mom', 'Primary', '+1 555-0101', true),
              const SizedBox(height: 12),
              _buildContactCard('Dad', 'Secondary', '+1 555-0102', true),
              const SizedBox(height: 12),
              _buildContactCard('Dr. Smith', 'Medical', '+1 555-0103', false),
              const SizedBox(height: 16),
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.drag_indicator, size: 16, color: AppColors.colorTextMuted),
                    const SizedBox(width: 8),
                    Text(
                      'Drag to reorder Emergency Priority',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorTextMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 80), // padding for FAB
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: AppColors.colorAquaMint,
        icon: const Icon(Icons.add, color: AppColors.colorDeepGreen),
        label: const Text('Add Contact', style: TextStyle(color: AppColors.colorDeepGreen, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildProtocolBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.colorDanger.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorDangerMuted),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.colorDanger.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.shield, color: AppColors.colorDanger),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Instant Alert Protocol', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorDanger)),
                const SizedBox(height: 4),
                Text('Overrides DND settings on recipients\' phones', style: AppTextStyles.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard(String name, String relation, String phone, bool verified) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.colorMintGreen.withValues(alpha: 0.1),
            child: Text(name[0], style: const TextStyle(color: AppColors.colorMintGreen, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(name, style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.colorSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.colorBorder),
                      ),
                      child: Text(relation, style: AppTextStyles.captionTech.copyWith(fontSize: 9)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(phone, style: AppTextStyles.bodySmall),
                    if (verified) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.verified, color: AppColors.colorAquaMint, size: 14),
                    ] else ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '• Pending Verification...',
                          style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorDanger, fontStyle: FontStyle.italic),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit, color: AppColors.colorTextMuted),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}
