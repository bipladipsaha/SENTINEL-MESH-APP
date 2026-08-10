import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.colorDeepGreen,
      primaryColor: AppColors.colorAquaMint,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.colorAquaMint,
        secondary: AppColors.colorMintGreen,
        surface: AppColors.colorSurface,
        error: AppColors.colorDanger,
      ),
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayLarge,
        displayMedium: AppTextStyles.displayMedium,
        labelLarge: AppTextStyles.labelLarge,
        labelMedium: AppTextStyles.labelMedium,
        bodyLarge: AppTextStyles.bodyMedium,
        bodyMedium: AppTextStyles.bodyMedium,
        bodySmall: AppTextStyles.bodySmall,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AppTextStyles.displayMedium,
      ),
    );
  }
}
