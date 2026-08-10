import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class SafetyAIScreen extends StatefulWidget {
  const SafetyAIScreen({super.key});

  @override
  State<SafetyAIScreen> createState() => _SafetyAIScreenState();
}

class _SafetyAIScreenState extends State<SafetyAIScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {'role': 'ai', 'content': 'I am your Sentinel Safety Assistant. How can I help you?'}
  ];
  bool _isLoading = false;

  late final GenerativeModel _model;

  @override
  void initState() {
    super.initState();
    _model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: dotenv.env['GEMINI_API_KEY'] ?? '',
    );
  }

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _isLoading = true;
    });
    _controller.clear();

    try {
      final content = [Content.text(text)];
      final response = await _model.generateContent(content);

      setState(() {
        _messages.add({'role': 'ai', 'content': response.text ?? 'No response.'});
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _messages.add({'role': 'ai', 'content': 'Error: $e'});
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorDeepGreen,
      appBar: AppBar(title: const Text("SAFETY AI ASSISTANT")),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isUser ? AppColors.colorSurfaceAlt : AppColors.colorAquaMint.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(msg['content'], style: AppTextStyles.bodyMedium.copyWith(color: Colors.white)),
                  ),
                );
              },
            ),
          ),
          if (_isLoading) const LinearProgressIndicator(color: AppColors.colorAquaMint),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: AppColors.colorSurface,
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(hintText: "Type your query...", border: InputBorder.none),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          IconButton(onPressed: _sendMessage, icon: const Icon(Icons.send_rounded, color: AppColors.colorAquaMint)),
        ],
      ),
    );
  }
}
