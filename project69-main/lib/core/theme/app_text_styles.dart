import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  static const String fontFamily = 'SpaceGrotesk';

  static TextStyle displayLarge = GoogleFonts.spaceGrotesk(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.colorTextPrimary,
  );

  static TextStyle displayMedium = GoogleFonts.spaceGrotesk(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    color: AppColors.colorTextPrimary,
  );

  static TextStyle labelLarge = GoogleFonts.spaceGrotesk(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.colorAquaMint,
  );

  static TextStyle labelMedium = GoogleFonts.spaceGrotesk(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.colorMintGreen,
  );

  static TextStyle bodyMedium = GoogleFonts.spaceGrotesk(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.colorTextSecondary,
  );

  static TextStyle bodySmall = GoogleFonts.spaceGrotesk(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.colorTextMuted,
  );

  static TextStyle captionTech = GoogleFonts.spaceGrotesk(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.colorTextMuted,
    letterSpacing: 1.5,
  );
}
