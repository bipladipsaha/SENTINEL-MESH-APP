import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_database/firebase_database.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../services/device_service.dart';
import '../../../services/auth_service.dart';

class DeviceScreen extends StatefulWidget {
  const DeviceScreen({super.key});

  @override
  State<DeviceScreen> createState() => _DeviceScreenState();
}

class _DeviceScreenState extends State<DeviceScreen> {
  final _deviceService = DeviceService();
  final _authService = AuthService();
  String? _deviceId;

  @override
  void initState() {
    super.initState();
    _loadDevice();
  }

  Future<void> _loadDevice() async {
    final uid = _authService.currentUser?.uid;
    if (uid != null) {
      final user = await _authService.getUserDetails(uid);
      if (mounted && user != null && user.espDevices.isNotEmpty) {
        setState(() {
          _deviceId = user.espDevices.first;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Device'),
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: _deviceId == null
            ? _buildNoDevice()
            : _buildDeviceDetails(),
      ),
    );
  }

  Widget _buildNoDevice() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.watch_off_outlined, size: 64, color: AppColors.colorTextSecondary),
          const SizedBox(height: 16),
          Text('No Device Connected', style: AppTextStyles.displayMedium),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              context.push('/device/pairing').then((_) => _loadDevice());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.colorAquaMint,
              foregroundColor: AppColors.colorDeepGreen,
            ),
            child: const Text('Pair Device'),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceDetails() {
    return StreamBuilder<DatabaseEvent>(
      stream: _deviceService.getDeviceStatusStream(_deviceId!),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        
        final data = snapshot.data?.snapshot.value as Map?;
        final status = data?['status'] ?? 'IDLE';
        final isActive = status == 'ACTIVE';

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildDeviceHeader(isActive),
              const SizedBox(height: 32),
              _buildMetricsGrid(),
              const SizedBox(height: 32),
              Text('DEVICE INFORMATION', style: AppTextStyles.captionTech),
              const SizedBox(height: 16),
              _buildInfoList(),
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.colorSurfaceAlt,
                  foregroundColor: AppColors.colorAquaMint,
                  side: const BorderSide(color: AppColors.colorBorder),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('RECONNECT DEVICE'),
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  context.push('/device/pairing').then((_) => _loadDevice());
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.colorTextSecondary,
                  side: const BorderSide(color: AppColors.colorTextMuted),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('PAIR NEW DEVICE'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDeviceHeader(bool isActive) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Column(
        children: [
          Icon(Icons.watch, size: 80, color: isActive ? AppColors.colorDanger : AppColors.colorAquaMint),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: isActive ? AppColors.colorDanger.withValues(alpha: 0.2) : AppColors.colorMintGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8, height: 8,
                  decoration: BoxDecoration(
                    color: isActive ? AppColors.colorDanger : AppColors.colorMintGreen,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(isActive ? 'EMERGENCY' : 'ACTIVE', style: TextStyle(color: isActive ? AppColors.colorDanger : AppColors.colorMintGreen, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text('Sentinel Wearable', style: AppTextStyles.displayMedium),
          Text('ID: $_deviceId', style: AppTextStyles.bodyMedium),
        ],
      ),
    );
  }

  Widget _buildMetricsGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildMetricCard('Battery', '93%', Icons.battery_charging_full, AppColors.colorMintGreen),
        _buildMetricCard('GPS Status', 'Locked', Icons.location_on, AppColors.colorAquaMint),
        _buildMetricCard('LoRa', 'Active', Icons.wifi_tethering, AppColors.colorMintGreen),
        _buildMetricCard('GSM', '3 Bars', Icons.signal_cellular_4_bar, AppColors.colorAquaMint),
      ],
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: AppTextStyles.bodySmall),
              Icon(icon, color: color, size: 20),
            ],
          ),
          Text(value, style: AppTextStyles.labelLarge.copyWith(fontSize: 18, color: color)),
        ],
      ),
    );
  }

  Widget _buildInfoList() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Column(
        children: [
          _buildInfoRow('Firmware Version', 'v4.2.1-stable'),
          const Divider(height: 1, color: AppColors.colorBorder),
          _buildInfoRow('Last Cloud Sync', '2 mins ago'),
          const Divider(height: 1, color: AppColors.colorBorder),
          _buildInfoRow('Hardware Rev', 'Mesh-Gen3'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTextStyles.bodyMedium),
          Text(value, style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
        ],
      ),
    );
  }
}
