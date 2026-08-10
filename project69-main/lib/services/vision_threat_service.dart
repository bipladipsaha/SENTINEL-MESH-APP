import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

class VisionThreatService {
  static final VisionThreatService _instance = VisionThreatService._internal();
  factory VisionThreatService() => _instance;
  VisionThreatService._internal();

  CameraController? _cameraController;
  Interpreter? _interpreter;
  bool _isScanning = false;
  DateTime _lastFrameTime = DateTime.now();
  
  // Callback when a visual threat (weapon) is detected
  Function(String)? onVisualThreatDetected;

  Future<void> initialize(CameraDescription camera) async {
    try {
      // Load custom YOLO TFLite model
      _interpreter = await Interpreter.fromAsset('assets/models/yolo_weapon.tflite');
      debugPrint('VisionThreatService: YOLO Model loaded successfully. Input shape: ${_interpreter!.getInputTensor(0).shape}');
      
      _cameraController = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
      );
      
      await _cameraController!.initialize();
      debugPrint('VisionThreatService initialized. Camera ready.');
    } catch (e) {
      debugPrint('Failed to initialize VisionThreatService: $e');
    }
  }

  Future<void> startScanning() async {
    if (_isScanning || _cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    _isScanning = true;
    _cameraController!.startImageStream((CameraImage image) {
      _processCameraImage(image);
    });
    
    debugPrint('VisionThreatService started scanning...');
  }

  void _processCameraImage(CameraImage image) {
    if (_interpreter == null) return;
    
    // We throttle inference to avoid freezing the UI (e.g. process 1 frame every second)
    if (DateTime.now().difference(_lastFrameTime).inMilliseconds < 1000) return;
    _lastFrameTime = DateTime.now();

    try {
      // Note: Actual YOLOv8/v11 requires converting YUV420 to an RGB float32 [1, 640, 640, 3] tensor.
      // This is a complex transformation. For production, consider using 'tflite_flutter_helper' 
      // or writing a native C++/Kotlin platform channel for fast YUV to RGB conversion.
      
      // Placeholder for inference logic once image conversion is built:
      // var input = convertCameraImageToTensor(image); 
      // var output = List.filled(1 * 84 * 8400, 0.0).reshape([1, 84, 8400]); // YOLOv8 typical output
      // _interpreter!.run(input, output);
      
      // // Post-process bounding boxes
      // double maxConfidence = calculateMaxConfidence(output);
      // if (maxConfidence > 0.6) { // 60% confidence threshold
      //   onVisualThreatDetected?.call("Weapon Detected");
      //   stopScanning();
      // }
      
      debugPrint("VisionThreatService: Frame processed (mock inference)");
    } catch (e) {
      debugPrint("VisionThreatService Inference Error: \$e");
    }
  }

  Future<void> stopScanning() async {
    if (!_isScanning || _cameraController == null) return;
    _isScanning = false;
    await _cameraController!.stopImageStream();
    debugPrint('VisionThreatService stopped scanning.');
  }
}
