import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all, color: AppColors.colorMintGreen),
            onPressed: () {},
          ),
        ],
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Notifications', style: AppTextStyles.displayMedium),
              const SizedBox(height: 8),
              Text(
                'Stay updated on network alerts and device status.',
                style: AppTextStyles.bodyMedium,
              ),
              const SizedBox(height: 32),
              
              Text('TODAY', style: AppTextStyles.captionTech),
              const SizedBox(height: 16),
              
              // Device Connected
              _buildNotificationCard(
                icon: Icons.wifi_tethering,
                iconColor: AppColors.colorMintGreen,
                title: 'DEVICE CONNECTED',
                message: 'Your Sentinel Device (SM-00125) is actively monitoring your vitals.',
                time: 'Just now',
              ),
              const SizedBox(height: 12),
              
              // Nearby Emergency
              _buildNotificationCard(
                icon: Icons.emergency,
                iconColor: AppColors.colorDanger,
                title: 'NEARBY EMERGENCY',
                message: 'A critical medical alert was triggered 850m from your location.',
                time: '10 min ago',
                showActions: true,
              ),
              const SizedBox(height: 32),
              
              Text('YESTERDAY', style: AppTextStyles.captionTech),
              const SizedBox(height: 16),
              
              // Low Battery
              _buildNotificationCard(
                icon: Icons.battery_alert,
                iconColor: Colors.orange,
                title: 'LOW BATTERY',
                message: 'Your mesh node battery is below 15%. Please recharge soon to maintain protection.',
                time: '18:45',
              ),
              const SizedBox(height: 12),
              
              // SOS Activated
              _buildNotificationCard(
                icon: Icons.shield,
                iconColor: AppColors.colorTextMuted,
                title: 'SOS ACTIVATED',
                message: 'Your emergency protocol was successfully tested. All systems operational.',
                time: '09:30',
              ),
              
              const SizedBox(height: 48),
              
              // End of Feed
              Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.colorSurfaceAlt,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.colorBorder),
                      ),
                      child: const Icon(Icons.check_circle_outline, color: AppColors.colorAquaMint, size: 32),
                    ),
                    const SizedBox(height: 16),
                    Text('End of Feed', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorTextMuted)),
                    const SizedBox(height: 4),
                    Text('You\'re all caught up.', style: AppTextStyles.bodySmall),
                  ],
                ),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String message,
    required String time,
    bool showActions = false,
  }) {
    return Container(
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(message, style: AppTextStyles.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
