import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../services/ble_service.dart';
import '../../services/auth_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  AppConnectionState _connectionState = AppConnectionState.disconnected;
  StreamSubscription? _bleSub;
  StreamSubscription? _sosSub;
  late AnimationController _pulseController;
  final _bleService = BleService();
  String? _deviceId;

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _initBleListener();
    _initNativeIntentListener();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    // Auto-connect to claimed device after permissions
    _autoConnectDevice();
  }

  Future<void> _requestPermissions() async {
    try {
      await [
        Permission.bluetoothScan,
        Permission.bluetoothConnect,
        Permission.bluetoothAdvertise,
      ].request();

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse) {
        await Permission.locationAlways.request();
      }
    } catch (e) {
      debugPrint("Permission Error: $e");
    }
  }

  /// Load user's device and auto-connect via BLE
  Future<void> _autoConnectDevice() async {
    try {
      final authService = AuthService();
      final uid = authService.currentUser?.uid;
      if (uid == null) return;

      final user = await authService.getUserDetails(uid);
      if (user == null || user.espDevices.isEmpty) return;

      _deviceId = user.espDevices.first;
      debugPrint('[HOME] Auto-connecting to $_deviceId');

      // Small delay to let permissions settle
      await Future.delayed(const Duration(seconds: 2));
      if (!mounted) return;

      final connected = await _bleService.connectByDeviceId(_deviceId!);
      debugPrint('[HOME] Auto-connect result: $connected');
    } catch (e) {
      debugPrint('[HOME] Auto-connect error: $e');
    }
  }

  /// Listen to BLE connection state changes
  void _initBleListener() {
    _bleSub = _bleService.connectionStateStream.listen((state) {
      if (!mounted) return;
      setState(() {
        switch (state) {
          case BleConnectionState.connected:
            _connectionState = AppConnectionState.connected;
          case BleConnectionState.scanning:
          case BleConnectionState.connecting:
            _connectionState = AppConnectionState.scanning;
          case BleConnectionState.disconnected:
            _connectionState = AppConnectionState.disconnected;
        }
      });
    });
  }

  bool _isNavigating = false;

  void _navigateToSenderIfNotThere() {
    if (!mounted || _isNavigating) return;
    final router = GoRouter.of(context);
    final currentPath = router.routerDelegate.currentConfiguration.uri.toString();
    
    if (!currentPath.startsWith('/sender')) {
      _isNavigating = true;
      context.push('/sender/countdown').then((_) {
         if (mounted) _isNavigating = false;
      });
    }
  }

  static const MethodChannel _channel = MethodChannel('sentinel_mesh/esp_watcher');

  Future<void> _initNativeIntentListener() async {
    try {
      final bool isAutoRecord = await _channel.invokeMethod('isAutoRecord') ?? false;
      if (isAutoRecord) {
        _navigateToSenderIfNotThere();
      }
    } catch (_) {}

    _channel.setMethodCallHandler((call) async {
      if (call.method == 'autoRecord') {
        _navigateToSenderIfNotThere();
      }
    });
  }

  @override
  void dispose() {
    _bleSub?.cancel();
    _sosSub?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _triggerSos() {
    _navigateToSenderIfNotThere();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const CircleAvatar(
              backgroundColor: AppColors.colorSurfaceAlt,
              child: Icon(Icons.person, color: AppColors.colorMintGreen),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Good Morning, User', style: AppTextStyles.labelLarge),
                Text('Sentinel Mesh', style: AppTextStyles.bodySmall),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppColors.colorMintGreen),
            onPressed: () => context.push('/notifications'),
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
              Text(
                'Your safety network is active and monitoring',
                style: AppTextStyles.displayMedium,
              ),
              const SizedBox(height: 24),
              _buildStatusBanner(),
              const SizedBox(height: 40),
              _buildSosButton(),
              const SizedBox(height: 40),
              Text('Quick Actions', style: AppTextStyles.labelLarge),
              const SizedBox(height: 16),
              _buildQuickActionsGrid(),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBanner() {
    final isConnected = _connectionState == AppConnectionState.connected;
    final isScanning = _connectionState == AppConnectionState.scanning;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isConnected ? AppColors.colorAquaMint.withValues(alpha: 0.2) : AppColors.colorDanger.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: isScanning
                ? const SizedBox(
                    width: 24, height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.colorAquaMint),
                  )
                : Icon(
                    isConnected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
                    color: isConnected ? AppColors.colorAquaMint : AppColors.colorDanger,
                  ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isConnected ? "CONNECTED" : isScanning ? "SCANNING..." : "DISCONNECTED",
                  style: AppTextStyles.labelLarge.copyWith(
                    color: isConnected ? AppColors.colorAquaMint : isScanning ? AppColors.colorMintGreen : AppColors.colorDanger,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isConnected
                      ? "Device ${_deviceId ?? ''} connected"
                      : isScanning
                          ? "Looking for your device..."
                          : _deviceId != null
                              ? "Tap to reconnect $_deviceId"
                              : "No device paired",
                  style: AppTextStyles.bodySmall,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.colorSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.colorBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.shield, size: 14, color: AppColors.colorMintGreen),
                const SizedBox(width: 4),
                Text(
                  isConnected ? 'Protected' : 'Offline',
                  style: AppTextStyles.captionTech.copyWith(
                    color: isConnected ? AppColors.colorMintGreen : AppColors.colorTextMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSosButton() {
    return Center(
      child: GestureDetector(
        onLongPress: _triggerSos,
        child: AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            return Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.colorDanger.withValues(alpha: 0.3 * _pulseController.value),
                    blurRadius: 50 * _pulseController.value,
                    spreadRadius: 20 * _pulseController.value,
                  ),
                ],
                gradient: const RadialGradient(
                  colors: [AppColors.colorDanger, AppColors.colorDangerMuted],
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.emergency, size: 48, color: Colors.white),
                  const SizedBox(height: 8),
                  Text(
                    'SOS',
                    style: AppTextStyles.displayLarge.copyWith(color: Colors.white, fontSize: 36),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Press & Hold',
                    style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildQuickActionsGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 2.5,
      children: [
        _buildActionBtn(Icons.contacts, 'Emergency\nContacts', () => context.push('/emergencies')),
        _buildActionBtn(Icons.radar, 'Nearby\nEmergencies', () => context.push('/radar')),
        _buildActionBtn(Icons.local_police, 'Find\nPolice', () => context.push('/police')),
        _buildActionBtn(Icons.local_hospital, 'Find\nHospital', () => context.push('/medical')),
        _buildActionBtn(Icons.settings_cell, 'Device\nSettings', () => context.push('/device')),
        _buildActionBtn(Icons.settings, 'App\nSettings', () => context.push('/profile/settings')),
      ],
    );
  }

  Widget _buildActionBtn(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: AppColors.colorSurfaceAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.colorBorder),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.colorMintGreen, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum AppConnectionState {
  disconnected,
  scanning,
  connected,
}
