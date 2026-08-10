import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class EmergencyHistoryScreen extends StatelessWidget {
  const EmergencyHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency History'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Emergency History', style: AppTextStyles.displayMedium),
              const SizedBox(height: 8),
              Text(
                'Review past incidents and response summaries.',
                style: AppTextStyles.bodyMedium,
              ),
              const SizedBox(height: 32),
              _buildIncidentCard(
                context,
                date: 'Oct 24, 2023 • 14:22',
                title: 'Fall Detected',
                location: 'Central Park, North Entrance',
                status: 'Resolved',
                statusColor: AppColors.colorMintGreen,
                description: null,
                showReport: true,
              ),
              const SizedBox(height: 24),
              _buildIncidentCard(
                context,
                date: 'Oct 12, 2023 • 09:15',
                title: 'SOS Alert',
                location: 'Home - Living Room',
                status: 'Cancelled',
                statusColor: AppColors.colorTextSecondary,
                description: 'User cancelled within the 10-second safety window. No emergency services were dispatched.',
                showReport: false,
              ),
              const SizedBox(height: 24),
              _buildIncidentCard(
                context,
                date: 'Sep 28, 2023 • 23:45',
                title: 'Panic Button Pressed',
                location: 'Market Street Metro Station',
                status: 'Resolved',
                statusColor: AppColors.colorMintGreen,
                description: null,
                showReport: true,
              ),
              const SizedBox(height: 32),
              Center(
                child: Text(
                  'Showing records from the last 90 days',
                  style: AppTextStyles.bodySmall,
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.download, color: AppColors.colorAquaMint, size: 18),
                  label: Text('Download All Records (PDF)', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorAquaMint)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.colorAquaMint),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: const StadiumBorder(),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIncidentCard(
    BuildContext context, {
    required String date,
    required String title,
    required String location,
    required String status,
    required Color statusColor,
    String? description,
    required bool showReport,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Timeline indicator
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
            Container(
              width: 2,
              height: 200,
              color: AppColors.colorBorder,
            ),
          ],
        ),
        const SizedBox(width: 16),
        // Card content
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.colorSurfaceAlt,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.colorBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(date, style: AppTextStyles.bodySmall),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(status, style: AppTextStyles.captionTech.copyWith(color: statusColor, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(title, style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 18)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: AppColors.colorTextMuted),
                    const SizedBox(width: 4),
                    Expanded(child: Text(location, style: AppTextStyles.bodySmall)),
                  ],
                ),
                const SizedBox(height: 12),
                // Map placeholder
                Container(
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppColors.colorSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.colorBorder),
                  ),
                  child: const Center(
                    child: Icon(Icons.map, size: 40, color: AppColors.colorTextMuted),
                  ),
                ),
                if (description != null) ...[
                  const SizedBox(height: 12),
                  Text(description, style: AppTextStyles.bodySmall.copyWith(fontStyle: FontStyle.italic)),
                ],
                if (showReport) ...[
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('View Full Report', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorAquaMint)),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.colorAquaMint),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}
