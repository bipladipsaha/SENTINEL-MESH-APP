import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Opal-inspired Color Palette (Clean, Soft, Modern)
  static const Color bg = Color(0xFF0F1115);
  static const Color surface = Color(0xFF1C1E24);
  static const Color accentCyan = Color(0xFF4EEBC3); // Soft Mint
  static const Color accentRose = Color(0xFFFF6B6B); // Soft Rose
  static const Color accentBlue = Color(0xFF4A90E2); // Modern Blue
  static const Color textMain = Color(0xFFF8F9FA);
  static const Color textDim = Color(0xFF9BA1A6);
  static const Color success = Color(0xFF2ECC71);
  static const Color error = Color(0xFFE74C3C);

  // Aliases for compatibility with existing code
  static const Color background = bg;
  static const Color primary = accentCyan;
  static const Color primaryDark = Color(0xFF1A535C); // Deep Teal
  static const Color secondary = accentBlue;
  static const Color textPrimary = textMain;
  static const Color textSecondary = textDim;

  static ThemeData get theme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg,
      primaryColor: accentCyan,
      fontFamily: GoogleFonts.outfit().fontFamily,
      colorScheme: const ColorScheme.dark(
        primary: accentCyan,
        secondary: accentBlue,
        surface: surface,
        error: error,
      ),
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.outfit(color: textMain, fontWeight: FontWeight.w900, fontSize: 32, letterSpacing: 1),
        titleLarge: GoogleFonts.outfit(color: textMain, fontWeight: FontWeight.w700, fontSize: 20),
        bodyLarge: GoogleFonts.inter(color: textMain, fontSize: 16),
        bodyMedium: GoogleFonts.inter(color: textDim, fontSize: 14),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.outfit(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: textMain,
          letterSpacing: 1.5,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentCyan,
          foregroundColor: bg,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
    );
  }

  // Alias for backward compatibility
  static ThemeData get darkTheme => theme;
}
