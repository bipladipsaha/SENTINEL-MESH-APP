import 'dart:math';
import '../models/threat_level.dart';

class ThreatEvaluator {
  /// Evaluates multiple sensor inputs to produce a threat score (0.0 to 1.0)
  static double calculateScore({
    required bool bleSosTriggered,
    required bool motionAnomaly,
    required String? audioClassification,
    required bool isUnsafeLocation,
  }) {
    double score = 0.0;

    // Hardware Mesh is highest priority
    if (bleSosTriggered) score += 0.8;

    // Motion patterns (jolt/fall)
    if (motionAnomaly) score += 0.3;

    // Audio Analysis (Screams, Glass breaking)
    if (audioClassification != null) {
      if (audioClassification.contains('scream') || audioClassification.contains('shout')) score += 0.5;
      if (audioClassification.contains('glass') || audioClassification.contains('bang')) score += 0.4;
    }

    // Geofencing context
    if (isUnsafeLocation) score += 0.15;

    return min(1.0, score);
  }

  static ThreatLevel mapScoreToLevel(double score) {
    if (score >= 0.8) return ThreatLevel.defcon1Action;
    if (score >= 0.5) return ThreatLevel.defcon2Verification;
    if (score >= 0.2) return ThreatLevel.defcon4Suspicion;
    return ThreatLevel.defcon5Baseline;
  }
}
