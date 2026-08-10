import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class AIService {
  static String get geminiKey => dotenv.env['GEMINI_API_KEY'] ?? '';
  static String get groqKey => dotenv.env['GROQ_API_KEY'] ?? '';

  // ──────────────────────────────────────────────
  // GEMINI REST API (Direct HTTP, no broken package)
  // ──────────────────────────────────────────────
  static Future<String?> _callGemini({
    required String model,
    required List<Map<String, dynamic>> parts,
  }) async {
    if (geminiKey.isEmpty) return null;

    final url = Uri.parse(
      'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$geminiKey',
    );

    final body = jsonEncode({
      'contents': [
        {'parts': parts}
      ],
      'generationConfig': {'temperature': 0.2},
    });

    try {
      debugPrint("AI Core [Gemini]: Calling $model...");
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: body,
      ).timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final text = json['candidates']?[0]?['content']?['parts']?[0]?['text'];
        if (text != null && text.toString().isNotEmpty) {
          debugPrint("AI Core [Gemini]: ✅ $model succeeded!");
          return text.toString();
        }
      } else {
        debugPrint("AI Core [Gemini]: ❌ $model returned ${response.statusCode}");
      }
    } catch (e) {
      debugPrint("AI Core [Gemini]: ❌ $model exception: $e");
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // GROQ REST API (Free, blazing fast, Llama 3)
  // ──────────────────────────────────────────────
  static Future<String?> _callGroq({
    required String model,
    required String prompt,
  }) async {
    if (groqKey.isEmpty) return null;

    final url = Uri.parse('https://api.groq.com/openai/v1/chat/completions');

    final body = jsonEncode({
      'model': model,
      'messages': [
        {
          'role': 'system',
          'content': 'You are Sentinel AI, a professional emergency incident report generator for law enforcement and medical responders. Generate detailed, objective, and actionable reports.',
        },
        {
          'role': 'user',
          'content': prompt,
        },
      ],
      'temperature': 0.2,
      'max_tokens': 1024,
    });

    try {
      debugPrint("AI Core [Groq]: Calling $model...");
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $groqKey',
        },
        body: body,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final text = json['choices']?[0]?['message']?['content'];
        if (text != null && text.toString().isNotEmpty) {
          debugPrint("AI Core [Groq]: ✅ $model succeeded!");
          return text.toString();
        }
      } else {
        debugPrint("AI Core [Groq]: ❌ $model returned ${response.statusCode}: ${response.body.length > 300 ? response.body.substring(0, 300) : response.body}");
      }
    } catch (e) {
      debugPrint("AI Core [Groq]: ❌ $model exception: $e");
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // MAIN: Generate Video Incident Report
  // ──────────────────────────────────────────────
  static Future<String> generateVideoReport(String videoPath) async {
    if (geminiKey.isEmpty && groqKey.isEmpty) {
      return "Error: No API keys configured. Add GEMINI_API_KEY or GROQ_API_KEY to your .env file.";
    }

    final file = File(videoPath);
    if (!await file.exists()) return "Error: Video file not found at $videoPath";

    final bytes = await file.readAsBytes();
    debugPrint("AI Core: Video loaded (${bytes.length} bytes). Starting multi-provider analysis...");

    final videoPrompt = """
Analyze this emergency situation from the provided media and generate a professional 'Sentinel Incident Report'.
Focus on:
1. Threat Assessment: Nature of the emergency (assault, medical, fall, etc.)
2. Visual Identifiers: Brief description of people or surroundings.
3. Audio Context: Notable sounds (screams, sirens, voices).
4. Recommendation: Priority level for responding officials.
Keep it objective and professional for law enforcement/medical use.
""";

    final textPrompt = """
Generate a high-priority Sentinel Incident Report for an emergency SOS recording.

INCIDENT METADATA:
- Timestamp: ${DateTime.now().toIso8601String()}
- Duration: Approximately 5-15 seconds of video recorded
- Trigger: SOS button activated by user
- Status: Video evidence has been captured and saved securely
- Video Size: ${(bytes.length / 1024).toStringAsFixed(0)} KB

Generate a professional, structured incident report with:
1. INCIDENT SUMMARY (brief overview)
2. THREAT ASSESSMENT (severity: LOW / MEDIUM / HIGH / CRITICAL)
3. RECOMMENDED RESPONSE (specific actions for officials)
4. EVIDENCE STATUS (confirmation that video evidence is preserved)

Format it professionally for law enforcement / emergency responders.
""";

    // ═══════════════════════════════════════════
    // TIER 1: Gemini with full video analysis
    // ═══════════════════════════════════════════
    if (geminiKey.isNotEmpty) {
      final base64Video = base64Encode(bytes);
      final videoParts = [
        {
          'inlineData': {
            'mimeType': 'video/mp4',
            'data': base64Video,
          }
        },
        {'text': videoPrompt},
      ];

      debugPrint("AI Core: === TIER 1: Gemini Video Analysis ===");
      for (final model in ['gemini-2.0-flash', 'gemini-2.0-flash-lite']) {
        final result = await _callGemini(model: model, parts: videoParts);
        if (result != null) return result;
      }
    }

    // ═══════════════════════════════════════════
    // TIER 2: Groq text-based report (FREE)
    // ═══════════════════════════════════════════
    if (groqKey.isNotEmpty) {
      debugPrint("AI Core: === TIER 2: Groq Text Report ===");
      for (final model in ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']) {
        final result = await _callGroq(model: model, prompt: textPrompt);
        if (result != null) {
          return "【AI INCIDENT REPORT — Powered by Sentinel AI】\n\n$result\n\n"
              "📹 Video evidence saved securely for manual review by officials.";
        }
      }
    }

    // ═══════════════════════════════════════════
    // TIER 3: Gemini text-only fallback
    // ═══════════════════════════════════════════
    if (geminiKey.isNotEmpty) {
      debugPrint("AI Core: === TIER 3: Gemini Text Fallback ===");
      final textParts = [
        {'text': textPrompt},
      ];
      for (final model in ['gemini-2.0-flash', 'gemini-2.0-flash-lite']) {
        final result = await _callGemini(model: model, parts: textParts);
        if (result != null) {
          return "【FAILSAFE REPORT — VIDEO SAVED FOR MANUAL REVIEW】\n\n$result";
        }
      }
    }

    // ═══════════════════════════════════════════
    // TIER 4: Offline hardcoded report
    // ═══════════════════════════════════════════
    debugPrint("AI Core: ⚠️ All providers failed. Returning offline report.");
    return """
【OFFLINE EMERGENCY REPORT】

Timestamp: ${DateTime.now().toIso8601String()}
Status: HIGH PRIORITY
Video Evidence: ${(bytes.length / 1024).toStringAsFixed(0)} KB saved locally

An emergency SOS has been triggered. Video evidence has been recorded and saved.
All AI analysis services were temporarily unreachable.

RECOMMENDED ACTION: Forward this report and attached video evidence to local authorities immediately for manual review.

— Sentinel Mesh Autonomous Safety System
""";
  }

  // ──────────────────────────────────────────────
  // UTILITY: General text generation
  // ──────────────────────────────────────────────
  static Future<String> getEmergencyAdvice(String prompt) async {
    return _generate(prompt, "You are 'Sentinel AI', an emergency medical and safety assistant.");
  }

  static Future<Map<String, dynamic>> reasonOverEnvironment(Map<String, dynamic> context) async {
    final String prompt = "Context: $context. Analyze threat. Return JSON: {\"threat_score\": 0..1, \"recommended_action\": \"string\", \"reasoning\": \"string\"}";
    try {
      final response = await _generate(prompt, "You are the Autonomous Brain of Sentinel Mesh.");
      return {"score": 0.1, "action": "monitor", "reasoning": response};
    } catch (_) {
      return {"score": 0.0, "action": "none", "reasoning": "Offline baseline"};
    }
  }

  static Future<String> _generate(String prompt, String systemContext) async {
    // Try Groq first (free and fast)
    if (groqKey.isNotEmpty) {
      final result = await _callGroq(
        model: 'llama-3.3-70b-versatile',
        prompt: "$systemContext\n\n$prompt",
      );
      if (result != null) return result;
    }

    // Fallback to Gemini
    if (geminiKey.isNotEmpty) {
      final result = await _callGemini(
        model: 'gemini-2.0-flash',
        parts: [
          {'text': "$systemContext\nUser: $prompt"},
        ],
      );
      if (result != null) return result;
    }

    return "AI services are currently unavailable. Please try again later.";
  }
}
