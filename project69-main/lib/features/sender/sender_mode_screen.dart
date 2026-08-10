import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../services/ai_service.dart';
import '../../services/auth_service.dart';
import '../../services/fall_detection_service.dart';
import 'widgets/sos_pulse_button.dart';
import 'widgets/fall_detection_toggle.dart';

class SenderModeScreen extends StatefulWidget {
  final bool autoStartRecording;
  const SenderModeScreen({super.key, this.autoStartRecording = false});

  @override
  State<SenderModeScreen> createState() => _SenderModeScreenState();
}

class _SenderModeScreenState extends State<SenderModeScreen> {
  CameraController? _cameraController;
  bool _isRecording = false;
  bool _fallDetectionEnabled = false;
  bool _fallDetected = false;
  FallDetectionService? _fallDetectionService;
  StreamSubscription? _sosSub;
  StreamSubscription? _stopSub;
  String? _aiReport;
  bool _isAnalyzing = false;

  // Dynamic device ID — loaded from the user's claimed devices
  String? _deviceId;
  bool _deviceLoading = true;

  @override
  void initState() {
    super.initState();
    _initCamera();
    _loadDeviceIdAndListen();
  }

  /// Load the user's claimed device ID from Firebase, then start listening.
  Future<void> _loadDeviceIdAndListen() async {
    try {
      final authService = AuthService();
      final uid = authService.currentUser?.uid;
      if (uid != null) {
        final user = await authService.getUserDetails(uid);
        if (user != null && user.espDevices.isNotEmpty) {
          _deviceId = user.espDevices.first;
          debugPrint('📱 Loaded device ID: $_deviceId');
        }
      }
    } catch (e) {
      debugPrint('❌ Failed to load device ID: $e');
    }

    if (mounted) {
      setState(() => _deviceLoading = false);
    }

    if (_deviceId == null) {
      debugPrint('⚠️ No device claimed — Firebase listener not started');
      return;
    }

    // Start Firebase listener with the actual device ID
    _sosSub = FirebaseDatabase.instance
        .ref('devices')
        .child(_deviceId!)
        .onValue
        .listen((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data != null) {
        final status = data['status'];
        if (status == 'ACTIVE') {
          debugPrint("🚨 UI: Hardware SOS ACTIVE in Firebase for $_deviceId");
          if (mounted && !_isRecording) {
            _triggerSOSWithRetry();
          }
        } else if (status == 'IDLE') {
          debugPrint("🚨 UI: Hardware SOS IDLE in Firebase for $_deviceId");
          if (mounted && _isRecording) {
            _triggerSOS(); // Toggles recording off
          }
        }
      }
    });
  }

  /// Retries SOS trigger if camera is still initializing
  void _triggerSOSWithRetry() async {
    int attempts = 0;
    while (attempts < 10) {
      if (_cameraController != null && _cameraController!.value.isInitialized) {
        _triggerSOS();
        return;
      }
      debugPrint("⏳ Waiting for camera to initialize before SOS...");
      await Future.delayed(const Duration(milliseconds: 500));
      attempts++;
    }
    debugPrint("❌ Failed to trigger hardware SOS: Camera timed out.");
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) return;

      _cameraController = CameraController(cameras[0], ResolutionPreset.medium, enableAudio: true);
      await _cameraController!.initialize();
      if (mounted) {
        setState(() {});
        if (widget.autoStartRecording) {
            _triggerSOSWithRetry();
        }
      }
    } catch (e) {
      debugPrint("Camera Error: $e");
    }
  }

  @override
  void dispose() {
    _sosSub?.cancel();
    _stopSub?.cancel();
    _stopFallDetection();
    _cameraController?.dispose();
    super.dispose();
  }

  void _toggleFallDetection(bool enabled) {
    setState(() => _fallDetectionEnabled = enabled);
    if (enabled) {
      _startFallDetection();
    } else {
      _stopFallDetection();
    }
  }

  void _startFallDetection() {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    _fallDetectionService = FallDetectionService(onFallDetected: _onFallDetected);
    _cameraController!.startImageStream((image) {
       _fallDetectionService?.processCameraImage(image, _cameraController!.description);
    });
  }

  void _stopFallDetection() {
    _cameraController?.stopImageStream();
    _fallDetectionService?.dispose();
    _fallDetectionService = null;
  }

  void _onFallDetected() {
    if (mounted) setState(() => _fallDetected = true);
    _triggerSOS();
  }

  void _generateAIReport(String path) async {
    setState(() => _isAnalyzing = true);
    final report = await AIService.generateVideoReport(path);
    
    // Automatically store the generated report in Firebase
    try {
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high).timeout(const Duration(seconds: 5), onTimeout: () => Position(longitude: 0, latitude: 0, timestamp: DateTime.now(), accuracy: 0, altitude: 0, altitudeAccuracy: 0, heading: 0, headingAccuracy: 0, speed: 0, speedAccuracy: 0));
      await FirebaseDatabase.instance.ref('incident_reports').push().set({
        'timestamp': DateTime.now().toIso8601String(),
        'report': report,
        'video_local_path': path,
        'lat': pos.latitude,
        'lng': pos.longitude,
        'status': 'auto_generated'
      });
      debugPrint("✅ Report saved to Firebase successfully.");
    } catch (e) {
      debugPrint("❌ Failed to save report to Firebase: $e");
    }

    if (mounted) {
      setState(() {
        _aiReport = report;
        _isAnalyzing = false;
      });
    }
  }

  bool _isStartingRecording = false;

  Future<void> _triggerSOS() async {
    if (_deviceId == null) {
      debugPrint("❌ TriggerSOS Failed: No device claimed.");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No device linked. Go to Device Settings to pair your ESP32.')),
        );
      }
      return;
    }

    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      debugPrint("❌ TriggerSOS Failed: Camera not ready.");
      return;
    }

    HapticFeedback.heavyImpact();

    if (!_isRecording && !_isStartingRecording) {
      _isStartingRecording = true;
      // CRITICAL FIX: Stop image stream (Fall Detection) before starting video recording
      if (_fallDetectionEnabled) {
        try { await _cameraController?.stopImageStream(); } catch (_) {}
      }

      _aiReport = null; // Clear old report
      
      try {
        debugPrint("⏳ Hardware warmup for video recording...");
        await Future.delayed(const Duration(milliseconds: 1500)); 
        await _cameraController!.startVideoRecording();
        setState(() => _isRecording = true);
        debugPrint("✅ Recording started successfully");
      } catch (e) {
        debugPrint("❌ CRITICAL ERROR starting video recording: $e");
        // If it fails because it's already recording, just update state
        if (e.toString().contains('already recording')) {
           setState(() => _isRecording = true);
        }
      } finally {
        _isStartingRecording = false;
      }

      try {
        final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high).timeout(const Duration(seconds: 5));
        await FirebaseDatabase.instance.ref('devices/$_deviceId').update({
          'status': 'ACTIVE',
          'lat': pos.latitude,
          'lng': pos.longitude,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        });
      } catch (_) {
        await FirebaseDatabase.instance.ref('devices/$_deviceId').update({
          'status': 'ACTIVE',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        });
      }
    } else if (_isRecording) {
      // CRITICAL FIX: Instantly update the UI so the user sees it stop immediately
      setState(() => _isRecording = false);
      
      XFile? file;
      try {
        debugPrint("⏳ Attempting to stop camera recording...");
        // Add timeout to prevent camera plugin deadlock
        file = await _cameraController!.stopVideoRecording().timeout(const Duration(seconds: 3));
        debugPrint("✅ Camera recording stopped successfully");
      } catch (e) {
        debugPrint("❌ Error/Timeout stopping video recording: $e");
      }

      // Resume Fall Detection if it was enabled
      if (_fallDetectionEnabled) {
        _startFallDetection();
      }

      try {
        await FirebaseDatabase.instance.ref('devices/$_deviceId').update({'status': 'IDLE'});
      } catch (_) {}

      if (mounted && file != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Recording ended. AI Analysis starting...")),
        );
        _generateAIReport(file.path);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Camera Preview Background
          if (_cameraController != null && _cameraController!.value.isInitialized)
            Positioned.fill(
              child: AspectRatio(
                aspectRatio: _cameraController!.value.aspectRatio,
                child: CameraPreview(_cameraController!),
              ),
            )
          else
            Container(color: AppColors.colorDeepGreen),

          // Dark Overlay for UI readability
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.4),
            ),
          ),

          // No device warning
          if (!_deviceLoading && _deviceId == null)
            Positioned(
              top: 100,
              left: 24,
              right: 24,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.colorDanger.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.colorDanger),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_rounded, color: AppColors.colorDanger),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'No device linked. Pair your ESP32 in Device Settings first.',
                        style: TextStyle(color: Colors.white, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // AI Report Overlay
          if (_aiReport != null || _isAnalyzing)
            Positioned.fill(
              child: Container(
                color: Colors.black87,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("INCIDENT REPORT", style: AppTextStyles.displayMedium.copyWith(color: AppColors.colorAquaMint)),
                        IconButton(
                          onPressed: () => setState(() => _aiReport = null),
                          icon: const Icon(Icons.close, color: Colors.white70),
                        )
                      ],
                    ),
                    const SizedBox(height: 24),
                    Expanded(
                      child: SingleChildScrollView(
                        child: _isAnalyzing
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const SizedBox(height: 100),
                                  const CircularProgressIndicator(color: AppColors.colorAquaMint),
                                  const SizedBox(height: 24),
                                  Text("AI EXAMINING EVIDENCE...", style: AppTextStyles.labelLarge),
                                ],
                              ),
                            )
                          : Text(
                              _aiReport!,
                              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.colorMintWhite, height: 1.5),
                            ),
                      ),
                    ),
                    if (!_isAnalyzing)
                      Padding(
                        padding: const EdgeInsets.only(top: 24),
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            // Forward report to higher officials via Firebase
                            try {
                              await FirebaseDatabase.instance.ref('official_escalations').push().set({
                                'timestamp': DateTime.now().toIso8601String(),
                                'report': _aiReport,
                                'status': 'escalated_to_police'
                              });
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('✅ Report forwarded to higher officials securely.', style: TextStyle(color: Colors.white)),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                                setState(() => _aiReport = null); // Close the report overlay
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('❌ Failed to forward report. Check connection.')),
                                );
                              }
                            }
                          },
                          icon: const Icon(Icons.share_rounded),
                          label: const Text("FORWARD TO OFFICIALS"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.colorAquaMint,
                            foregroundColor: AppColors.colorDeepGreen,
                            minimumSize: const Size(double.infinity, 54),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

          // Header (Simple close button only)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                    onPressed: () => Navigator.pop(context),
                  ),
                  if (_deviceId != null) ...[
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.colorSurfaceAlt,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _deviceId!,
                        style: AppTextStyles.captionTech.copyWith(color: AppColors.colorAquaMint),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Bottom Controls
          Positioned(
            bottom: 40,
            left: 24,
            right: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_fallDetected)
                  Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.colorDanger.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.colorDanger),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_rounded, color: AppColors.colorDanger),
                        const SizedBox(width: 12),
                        Text("FALL DETECTED — SOS ACTIVE", style: AppTextStyles.labelMedium.copyWith(color: Colors.white)),
                      ],
                    ),
                  ),
                FallDetectionToggle(
                  initialValue: _fallDetectionEnabled,
                  onChanged: _toggleFallDetection,
                ),
                const SizedBox(height: 60),
                SOSPulseButton(
                  onTrigger: _triggerSOS,
                  isRecording: _isRecording,
                ),
                const SizedBox(height: 40),
                Text(
                  _deviceId != null
                      ? "ESP32 ($_deviceId) AUTO-MONITORING ACTIVE"
                      : "NO DEVICE LINKED",
                  style: AppTextStyles.captionTech,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
