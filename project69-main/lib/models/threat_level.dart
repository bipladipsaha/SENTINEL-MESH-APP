enum ThreatLevel {
  defcon5Baseline,    // Monitoring low-power sensors
  defcon4Suspicion,   // Anomaly detected, waking microphone
  defcon2Verification, // Sound pattern match, starting camera/vision
  defcon1Action,      // Threat confirmed, broadcasting SOS/Mesh
}

class AIState {
  final ThreatLevel level;
  final double confidence;
  final String reasoning;
  final Map<String, dynamic> activeSensors;

  AIState({
    required this.level,
    required this.confidence,
    required this.reasoning,
    required this.activeSensors,
  });

  factory AIState.initial() => AIState(
    level: ThreatLevel.defcon5Baseline,
    confidence: 0.0,
    reasoning: "System monitoring hardware mesh and accelerometer.",
    activeSensors: {"BLE": true, "Motion": true, "Mic": false, "Camera": false},
  );
}
