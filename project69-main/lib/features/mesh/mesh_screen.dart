import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class MeshScreen extends StatelessWidget {
  const MeshScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mesh Network'),
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildMeshStatusBanner(),
              const SizedBox(height: 32),
              Text('NEARBY NODES', style: AppTextStyles.captionTech),
              const SizedBox(height: 16),
              _buildNodeCard('Node Alpha', '1.2 km away', true),
              const SizedBox(height: 12),
              _buildNodeCard('Node Bravo', '3.5 km away', true),
              const SizedBox(height: 12),
              _buildNodeCard('Node Charlie', 'Offline', false),
              const SizedBox(height: 32),
              Center(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.refresh, color: AppColors.colorMintGreen),
                  label: const Text('Scan Network'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.colorMintGreen,
                    side: const BorderSide(color: AppColors.colorMintGreen),
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMeshStatusBanner() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.colorSurfaceAlt,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.colorAquaMint.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: AppColors.colorAquaMint.withValues(alpha: 0.1),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.hub, size: 64, color: AppColors.colorAquaMint),
          const SizedBox(height: 16),
          Text('Mesh Active', style: AppTextStyles.displayMedium.copyWith(color: AppColors.colorAquaMint)),
          const SizedBox(height: 8),
          Text('2 nodes connected', style: AppTextStyles.bodyMedium),
        ],
      ),
    );
  }

  Widget _buildNodeCard(String name, String status, bool isOnline) {
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
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isOnline ? AppColors.colorMintGreen.withValues(alpha: 0.1) : AppColors.colorTextMuted.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.router, color: isOnline ? AppColors.colorMintGreen : AppColors.colorTextMuted),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTextStyles.labelLarge.copyWith(color: Colors.white)),
                Text(status, style: AppTextStyles.bodySmall),
              ],
            ),
          ),
          Icon(
            isOnline ? Icons.wifi : Icons.wifi_off,
            color: isOnline ? AppColors.colorMintGreen : AppColors.colorTextMuted,
            size: 20,
          ),
        ],
      ),
    );
  }
}
