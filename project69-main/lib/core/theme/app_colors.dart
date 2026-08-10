import 'package:flutter/material.dart';

class AppColors {
  static const Color colorAquaMint = Color(0xFF2FE7C6);
  static const Color colorMintGreen = Color(0xFF2FEEA3);
  static const Color colorDeepGreen = Color(0xFF01140F);
  static const Color colorMintWhite = Color(0xFFDCF9F3);
  static const Color colorSurface = Color(0xFF0C1F1A);
  static const Color colorSurfaceAlt = Color(0xFF132920);
  static const Color colorDanger = Color(0xFFFF4D4D);
  static const Color colorDangerMuted = Color(0xFF7A1A1A);
  static const Color colorTextPrimary = Color(0xFFFFFFFF);
  static const Color colorTextSecondary = Color(0xFF8FB8A8);
  static const Color colorTextMuted = Color(0xFF4A7A68);
  static const Color colorBorder = Color(0xFF1E3D30);

  // Background Gradients
  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF0D2420),
      Color(0xFF01140F),
      Color(0xFF000D0A),
    ],
    stops: [0.0, 0.55, 1.0],
  );

  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      colorSurfaceAlt,
      colorSurface,
    ],
  );

  static const RadialGradient sosRadialGlow = RadialGradient(
    center: Alignment.center,
    radius: 0.85,
    colors: [
      Color(0xFF3D0A0A),
      colorDeepGreen,
    ],
  );

  static const RadialGradient radarGlow = RadialGradient(
    center: Alignment.center,
    radius: 0.7,
    colors: [
      Color(0xFF0D3328),
      colorDeepGreen,
    ],
  );

  static const RadialGradient atomHalo = RadialGradient(
    center: Alignment.center,
    radius: 1.0,
    colors: [
      Color(0xFF142E26),
      colorDeepGreen,
    ],
  );

  static LinearGradient statusBarGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [
      colorAquaMint.withValues(alpha: 0.12),
      colorMintGreen.withValues(alpha: 0.06),
      Colors.transparent,
    ],
  );
}
