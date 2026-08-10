import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../services/ble_service.dart';
import '../../../services/device_service.dart';

class DevicePairingScreen extends StatefulWidget {
  const DevicePairingScreen({super.key});

  @override
  State<DevicePairingScreen> createState() => _DevicePairingScreenState();
}

class _DevicePairingScreenState extends State<DevicePairingScreen> {
  int _currentStep = 0;
  final _deviceIdController = TextEditingController();
  final _bleService = BleService();
  final _deviceService = DeviceService();
  bool _isScanning = false;
  bool _isClaiming = false;
  List<ScanResult> _discoveredDevices = [];
  String? _errorMessage;

  @override
  void dispose() {
    _deviceIdController.dispose();
    super.dispose();
  }

  /// Start BLE scan for nearby Sentinel Mesh devices
  Future<void> _startScan() async {
    setState(() {
      _isScanning = true;
      _discoveredDevices = [];
      _errorMessage = null;
    });

    try {
      final results = await _bleService.scanForDevices(
        timeout: const Duration(seconds: 12),
      );
      if (mounted) {
        setState(() {
          _discoveredDevices = results;
          _isScanning = false;
          if (results.isEmpty) {
            _errorMessage = 'No Sentinel Mesh devices found nearby.\n'
                'Make sure your device is powered on and the blue LED is blinking.';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _errorMessage = 'Scan failed: ${e.toString()}';
        });
      }
    }
  }

  /// Claim a device by its ID (from scan or manual entry)
  Future<void> _claimDevice(String deviceId) async {
    if (deviceId.trim().isEmpty) {
      setState(() => _errorMessage = 'Please enter a Device ID');
      return;
    }

    setState(() {
      _isClaiming = true;
      _errorMessage = null;
      _currentStep = 1; // Move to Verify step
    });

    try {
      // Claim in Firebase
      await _deviceService.claimDevice(deviceId.trim(), 'Sentinel Wearable');

      // Try to connect via BLE (non-blocking — device may not be in range)
      _bleService.connectByDeviceId(deviceId.trim()).then((connected) {
        debugPrint('[PAIR] BLE connect result: $connected');
      });

      if (mounted) {
        setState(() {
          _currentStep = 2; // Complete step
          _isClaiming = false;
        });

        // Show success and navigate to connected screen
        await Future.delayed(const Duration(milliseconds: 500));
        if (mounted) {
          context.go('/device/connected');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentStep = 0;
          _isClaiming = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Sentinel Mesh'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.colorSurfaceAlt,
              child: Icon(Icons.person, color: AppColors.colorMintGreen, size: 20),
            ),
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
              // Stepper progress bar
              Row(
                children: [
                  _buildStepIndicator(0, 'Connect'),
                  _buildStepLine(0),
                  _buildStepIndicator(1, 'Verify'),
                  _buildStepLine(1),
                  _buildStepIndicator(2, 'Complete'),
                ],
              ),
              const SizedBox(height: 40),

              // Title
              Text(
                'Connect Your Device',
                style: AppTextStyles.displayMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'To begin your protection journey, pair your Sentinel Mesh wearable with the mesh network.',
                style: AppTextStyles.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),

              // Device illustration placeholder
              Container(
                height: 180,
                decoration: BoxDecoration(
                  color: AppColors.colorSurfaceAlt,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.colorBorder),
                ),
                child: const Center(
                  child: Icon(Icons.watch, size: 80, color: AppColors.colorAquaMint),
                ),
              ),
              const SizedBox(height: 40),

              // Error message
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.colorDanger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.colorDanger.withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppColors.colorDanger, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Scan for devices option
              _buildOptionRow(
                icon: Icons.bluetooth_searching,
                iconColor: AppColors.colorAquaMint,
                title: 'Scan for Devices',
                subtitle: 'Find nearby Sentinel Mesh devices via BLE',
                onTap: _isScanning ? null : _startScan,
                trailing: _isScanning
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.colorAquaMint,
                        ),
                      )
                    : null,
              ),
              const SizedBox(height: 16),

              // Show discovered devices
              if (_discoveredDevices.isNotEmpty) ...[
                Text('DEVICES FOUND', style: AppTextStyles.captionTech),
                const SizedBox(height: 8),
                ..._discoveredDevices.map((result) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _buildDeviceRow(result),
                )),
                const SizedBox(height: 16),
              ],

              // Enter Device ID option
              _buildOptionRow(
                icon: Icons.keyboard,
                iconColor: AppColors.colorMintGreen,
                title: 'Enter Device ID',
                subtitle: 'Type the ID from your device serial monitor',
                onTap: () => _showDeviceIdDialog(context),
              ),
              const SizedBox(height: 24),

              // Info text
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.colorSurfaceAlt,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.colorBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.colorTextMuted, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Ensure your device is charged and nearby. The LED should be blinking blue.',
                        style: AppTextStyles.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Pair Device button (start scan)
              ElevatedButton.icon(
                onPressed: _isScanning || _isClaiming ? null : _startScan,
                icon: _isScanning
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.colorDeepGreen),
                      )
                    : const Icon(Icons.bluetooth, size: 20),
                label: Text(
                  _isScanning ? 'Scanning...' : 'Scan & Pair Device',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.colorAquaMint,
                  foregroundColor: AppColors.colorDeepGreen,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: const StadiumBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Skip link
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    "I don't have a device yet",
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorTextSecondary),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDeviceRow(ScanResult result) {
    final name = result.device.platformName;
    final rssi = result.rssi;
    return InkWell(
      onTap: _isClaiming ? null : () => _claimDevice(name),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.colorSurfaceAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.colorAquaMint.withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.colorAquaMint.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.watch, color: AppColors.colorAquaMint, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                  Text('Signal: $rssi dBm', style: AppTextStyles.bodySmall),
                ],
              ),
            ),
            if (_isClaiming)
              const SizedBox(
                width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.colorAquaMint),
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.colorAquaMint.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'PAIR',
                  style: AppTextStyles.captionTech.copyWith(color: AppColors.colorAquaMint),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int step, String label) {
    final isActive = _currentStep >= step;
    return Expanded(
      child: Column(
        children: [
          Container(
            height: 6,
            decoration: BoxDecoration(
              color: isActive ? AppColors.colorAquaMint : AppColors.colorSurface,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: isActive ? AppColors.colorAquaMint : AppColors.colorTextMuted,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepLine(int afterStep) {
    return const SizedBox(width: 8);
  }

  Widget _buildOptionRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback? onTap,
    Widget? trailing,
  }) {
    return InkWell(
      onTap: onTap,
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
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
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
            trailing ?? const Icon(Icons.chevron_right, color: AppColors.colorTextMuted),
          ],
        ),
      ),
    );
  }

  void _showDeviceIdDialog(BuildContext context) {
    _deviceIdController.clear();
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.colorSurfaceAlt,
        title: Text('Enter Device ID', style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _deviceIdController,
              style: const TextStyle(color: Colors.white),
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                hintText: 'e.g. SM-00125',
                hintStyle: TextStyle(color: AppColors.colorTextMuted),
                prefixIcon: Icon(Icons.qr_code, color: AppColors.colorTextMuted),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Find this ID in your ESP32 Serial Monitor output.',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.colorTextMuted),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel', style: TextStyle(color: AppColors.colorTextMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              _claimDevice(_deviceIdController.text);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.colorAquaMint,
              foregroundColor: AppColors.colorDeepGreen,
            ),
            child: const Text('Claim Device'),
          ),
        ],
      ),
    );
  }
}
