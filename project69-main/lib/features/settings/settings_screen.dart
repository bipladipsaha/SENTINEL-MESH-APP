import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../services/auth_service.dart';
import '../../screens/auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _deviceActive = true;
  final _authService = AuthService();

  void _logout() async {
    await _authService.signOut();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
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
              Text('Settings', style: AppTextStyles.displayMedium),
              const SizedBox(height: 8),
              Text(
                'Manage your account and device preferences.',
                style: AppTextStyles.bodyMedium,
              ),
              const SizedBox(height: 32),

              // Notification & Language
              Container(
                decoration: BoxDecoration(
                  color: AppColors.colorSurfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.colorBorder),
                ),
                child: Column(
                  children: [
                    _buildSettingsRow(
                      icon: Icons.notifications_active_outlined,
                      iconColor: AppColors.colorDanger,
                      title: 'Notification Settings',
                      subtitle: 'Alerts, sounds, and priority',
                      onTap: () {},
                    ),
                    const Divider(height: 1, color: AppColors.colorBorder),
                    _buildSettingsRow(
                      icon: Icons.language,
                      iconColor: AppColors.colorAquaMint,
                      title: 'Language',
                      subtitle: 'English (United States)',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Device Active Toggle
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.colorSurfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.colorBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.colorAquaMint.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.shield_outlined, color: AppColors.colorAquaMint),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Device Active', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                          const SizedBox(height: 2),
                          Text('Currently monitoring mesh', style: AppTextStyles.bodySmall),
                        ],
                      ),
                    ),
                    Switch(
                      value: _deviceActive,
                      onChanged: (val) => setState(() => _deviceActive = val),
                      activeColor: AppColors.colorAquaMint,
                      activeTrackColor: AppColors.colorAquaMint.withValues(alpha: 0.3),
                      inactiveThumbColor: AppColors.colorTextMuted,
                      inactiveTrackColor: AppColors.colorSurface,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // About
              Container(
                decoration: BoxDecoration(
                  color: AppColors.colorSurfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.colorBorder),
                ),
                child: _buildSettingsRow(
                  icon: Icons.info_outline,
                  iconColor: AppColors.colorTextSecondary,
                  title: 'About TravelRakshak',
                  subtitle: 'Version 2.4.0 (Stable)',
                  onTap: () {},
                ),
              ),
              const SizedBox(height: 24),

              // Logout
              InkWell(
                onTap: _logout,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.colorSurfaceAlt,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.colorBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.colorDanger.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.logout, color: AppColors.colorDanger),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Logout', style: AppTextStyles.labelLarge.copyWith(color: AppColors.colorDanger)),
                            const SizedBox(height: 2),
                            Text('Securely exit your session', style: AppTextStyles.bodySmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Contact Support
              Center(
                child: Text('Need help with your Sentinel Device?', style: AppTextStyles.bodySmall),
              ),
              const SizedBox(height: 12),
              Center(
                child: OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.colorTextSecondary,
                    side: const BorderSide(color: AppColors.colorBorder),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    shape: const StadiumBorder(),
                  ),
                  child: const Text('Contact Support'),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: AppTextStyles.bodySmall),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.colorTextMuted),
          ],
        ),
      ),
    );
  }
}
