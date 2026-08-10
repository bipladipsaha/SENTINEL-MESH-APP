import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

class AudioAiService {
  static final AudioAiService _instance = AudioAiService._internal();
  factory AudioAiService() => _instance;
  AudioAiService._internal();

  final _record = AudioRecorder();
  Interpreter? _interpreter;
  bool _isListening = false;
  
  // Callback when a threat (like a scream) is detected
  Function(String)? onThreatDetected;

  Future<void> initialize() async {
    try {
      // TODO: Load the YAMNet TFLite model
      // _interpreter = await Interpreter.fromAsset('assets/models/yamnet.tflite');
      debugPrint('AudioAiService initialized. Model ready.');
    } catch (e) {
      debugPrint('Failed to load audio model: $e');
    }
  }

  Future<void> startListening() async {
    if (_isListening) return;

    if (await _record.hasPermission()) {
      _isListening = true;
      
      // Start recording a stream of audio data
      final stream = await _record.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: 16000,
          numChannels: 1,
        ),
      );

      stream.listen((data) {
        _processAudioBuffer(data);
      });
      
      debugPrint('AudioAiService started listening...');
    } else {
      debugPrint('Microphone permission denied.');
    }
  }

  void _processAudioBuffer(Uint8List data) {
    if (_interpreter == null) return;
    
    // TODO: Convert PCM16 data to float32 buffer expected by YAMNet
    // TODO: Run inference: _interpreter!.run(inputBuffer, outputBuffer);
    // TODO: Check output probabilities for target classes (e.g. Scream)
    
    // Example placeholder logic:
    // if (probability > 0.8) {
    //   onThreatDetected?.call("Scream detected!");
    //   stopListening();
    // }
  }

  Future<void> stopListening() async {
    if (!_isListening) return;
    _isListening = false;
    await _record.stop();
    debugPrint('AudioAiService stopped listening.');
  }
}
