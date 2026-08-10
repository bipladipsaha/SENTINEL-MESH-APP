import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../services/auth_service.dart';
import '../../../models/user_model.dart';
import '../../../screens/auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _authService = AuthService();
  UserModel? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final uid = _authService.currentUser?.uid;
    UserModel? user;
    if (uid != null) {
      user = await _authService.getUserDetails(uid);
    }
    
    // Fallback for UI demonstration if not logged in or DB fails
    if (user == null) {
      user = UserModel(
        uid: 'demo_user',
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        espDevices: ['SM-00125'],
      );
    }

    if (mounted) {
      setState(() => _user = user);
    }
  }

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
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppColors.colorMintGreen),
            onPressed: () {},
          ),
        ],
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: _user == null
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildProfileHeader(),
                    const SizedBox(height: 32),
                    Text('SECURITY IDENTITY', style: AppTextStyles.captionTech),
                    const SizedBox(height: 16),
                    _buildIdentityCard(),
                    const SizedBox(height: 32),
                    Text('VITAL MESH', style: AppTextStyles.captionTech),
                    const SizedBox(height: 16),
                    _buildVitalsCard(),
                    const SizedBox(height: 32),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Emergency Contacts', style: AppTextStyles.displayMedium.copyWith(fontSize: 20)),
                        TextButton(
                          onPressed: () {},
                          child: Text('Manage All', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorAquaMint)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildContactCard('MV', 'Marcus Vance', 'Husband • Immediate Responder'),
                    const SizedBox(height: 12),
                    _buildContactCard('SD', 'Sarah Drumm', 'Doctor • Secondary Alert'),
                    const SizedBox(height: 16),
                    _buildAddContactButton(),
                    const SizedBox(height: 40),
                    ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.settings, size: 20),
                      label: const Text('Edit Profile'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.colorAquaMint,
                        foregroundColor: AppColors.colorDeepGreen,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout, size: 20, color: AppColors.colorDanger),
                      label: const Text('Logout from Device', style: TextStyle(color: AppColors.colorDanger)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.colorDanger.withValues(alpha: 0.2),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                    const SizedBox(height: 32),
                    Center(
                      child: Text('Protected by Sentinel Mesh Encryption v4.2.0', style: AppTextStyles.bodySmall.copyWith(fontSize: 10)),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: () {},
                          child: Text('Privacy Policy', style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorAquaMint)),
                        ),
                        Text('•', style: AppTextStyles.bodySmall),
                        TextButton(
                          onPressed: () {},
                          child: Text('Help Center', style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorAquaMint)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Column(
      children: [
        Stack(
          alignment: Alignment.bottomRight,
          children: [
            const CircleAvatar(
              radius: 48,
              backgroundColor: AppColors.colorSurfaceAlt,
              child: Icon(Icons.person, size: 48, color: AppColors.colorMintGreen),
            ),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: AppColors.colorAquaMint,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.edit, size: 16, color: AppColors.colorDeepGreen),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(_user!.name, style: AppTextStyles.displayMedium),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.colorMintGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text('Premium Security Tier • Active', style: AppTextStyles.captionTech.copyWith(color: AppColors.colorMintGreen)),
        ),
      ],
    );
  }

  Widget _buildIdentityCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Column(
        children: [
          _buildInfoRow(Icons.fingerprint, 'DEVICE ID', _user!.espDevices.isNotEmpty ? _user!.espDevices.first : 'None'),
          const Divider(height: 1, color: AppColors.colorBorder),
          _buildInfoRow(Icons.phone, 'PHONE', '+1 (555) 234-9876'), // Using dummy as missing from UserModel
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.colorAquaMint, size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTextStyles.captionTech),
              const SizedBox(height: 4),
              Text(value, style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 16)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVitalsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.colorMintGreen.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorMintGreen.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.favorite_border, color: AppColors.colorAquaMint, size: 20),
                  const SizedBox(width: 8),
                  Text('Vital Mesh', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorAquaMint)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.colorAquaMint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('LIVE', style: AppTextStyles.captionTech.copyWith(color: AppColors.colorDeepGreen)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('72', style: AppTextStyles.displayLarge.copyWith(color: AppColors.colorAquaMint, fontSize: 48)),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Text('BPM', style: AppTextStyles.bodySmall),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Stable Resting Heart Rate', style: AppTextStyles.bodySmall),
        ],
      ),
    );
  }

  Widget _buildContactCard(String initials, String name, String subtitle) {
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
            backgroundColor: initials == 'MV' ? AppColors.colorMintGreen.withValues(alpha: 0.2) : AppColors.colorDanger.withValues(alpha: 0.2),
            child: Text(
              initials,
              style: TextStyle(
                color: initials == 'MV' ? AppColors.colorMintGreen : AppColors.colorDanger,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 16)),
                const SizedBox(height: 4),
                Text(subtitle, style: AppTextStyles.bodySmall),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.colorTextMuted),
        ],
      ),
    );
  }

  Widget _buildAddContactButton() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.colorBorder, style: BorderStyle.solid),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.add_circle_outline, color: AppColors.colorTextMuted, size: 20),
                const SizedBox(width: 8),
                Text('Add Emergency Contact', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorTextMuted)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

