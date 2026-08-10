import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/animations/blinking_dot.dart';

enum AppConnectionState { disconnected, scanning, connected }

class ConnectionStatusBar extends StatelessWidget {
  final AppConnectionState state;
  final VoidCallback onActionPressed;

  const ConnectionStatusBar({
    super.key,
    required this.state,
    required this.onActionPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.colorSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.colorBorder),
        gradient: state == AppConnectionState.connected ? AppColors.statusBarGradient : null,
      ),
      child: Row(
        children: [
          _buildIndicator(),
          const SizedBox(width: 12),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: Text(
                _getStatusText(),
                key: ValueKey(state),
                style: AppTextStyles.labelLarge.copyWith(
                  color: state == AppConnectionState.disconnected ? AppColors.colorDanger : AppColors.colorAquaMint,
                ),
              ),
            ),
          ),
          _buildActionButton(),
        ],
      ),
    );
  }

  Widget _buildIndicator() {
    switch (state) {
      case AppConnectionState.disconnected:
        return const Icon(Icons.bluetooth_disabled, color: AppColors.colorDanger, size: 16);
      case AppConnectionState.scanning:
        return const BlinkingDot(color: AppColors.colorMintGreen);
      case AppConnectionState.connected:
        return const Icon(Icons.bluetooth_connected, color: AppColors.colorAquaMint, size: 16);
    }
  }

  String _getStatusText() {
    switch (state) {
      case AppConnectionState.disconnected:
        return 'DISCONNECTED';
      case AppConnectionState.scanning:
        return 'SCANNING...';
      case AppConnectionState.connected:
        return 'CONNECTED';
    }
  }

  Widget _buildActionButton() {
    return TextButton(
      onPressed: onActionPressed,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        backgroundColor: (state == AppConnectionState.connected ? AppColors.colorDanger : AppColors.colorAquaMint).withValues(alpha: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: Text(
          state == AppConnectionState.connected ? 'DISCONNECT' : 'CONNECT',
          key: ValueKey(state),
          style: AppTextStyles.labelMedium.copyWith(
            color: state == AppConnectionState.connected ? AppColors.colorDanger : AppColors.colorAquaMint,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
