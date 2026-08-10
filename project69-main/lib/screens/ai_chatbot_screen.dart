import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../widgets/ai_floating_widget.dart';
import '../theme/app_theme.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class SafetyChatbotScreen extends StatefulWidget {
  const SafetyChatbotScreen({super.key});

  @override
  State<SafetyChatbotScreen> createState() => _SafetyChatbotScreenState();
}

class _SafetyChatbotScreenState extends State<SafetyChatbotScreen> {
  static String get _apiKey => dotenv.env['GEMINI_API_KEY'] ?? 'YOUR_GEMINI_API_KEY';

  late final GenerativeModel _model;
  late final ChatSession _chat;
  
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Message> _messages = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    AIFloatingWidget.isVisible.value = false;
    _initChatbot();
  }

  @override
  void dispose() {
    AIFloatingWidget.isVisible.value = true;
    super.dispose();
  }

  void _initChatbot() {
    _model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: _apiKey,
      systemInstruction: Content.system(
        "You are an expert safety assistant answering within the offline Guardian app."
        "Provide direct, concise advice on self-defense, first aid, emergency protocols, or legal rights."
        "Always recommend contacting local emergency authorities if the situation represents an immediate threat."
      ),
    );
    _chat = _model.startChat();
    
    setState(() {
      _messages.add(
        Message(
          text: "Hi there. I'm your AI Safety Assistant. How can I help you today? You can ask me about self-defense, first-aid, or safety protocols.",
          isUser: false,
        )
      );
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add(Message(text: text, isUser: true));
      _isLoading = true;
    });
    _textController.clear();
    _scrollToBottom();

    try {
      if (_apiKey == 'YOUR_GEMINI_API_KEY') {
        await Future.delayed(const Duration(seconds: 1));
        setState(() {
          _messages.add(Message(
            text: "⚠️ Placeholder API key detected. Please add your actual Gemini API Key in the source code to get real responses.",
            isUser: false,
          ));
        });
      } else {
        final response = await _chat.sendMessage(Content.text(text));
        setState(() {
          _messages.add(Message(text: response.text ?? 'No response', isUser: false));
        });
      }
    } catch (e) {
      setState(() {
        _messages.add(Message(text: "Error: Could not process request. Please check your network context.", isUser: false));
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: const Text('SAFETY AI ASSISTANT'),
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textMain, size: 20), onPressed: () => Navigator.pop(context)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return _buildMessageBubble(message);
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(12.0),
              child: CircularProgressIndicator(color: AppTheme.accentCyan),
            ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Message message) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isUser ? AppTheme.surface : AppTheme.accentCyan.withValues(alpha: 0.1),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: isUser ? const Radius.circular(20) : Radius.zero,
            bottomRight: isUser ? Radius.zero : const Radius.circular(20),
          ),
          border: Border.all(color: isUser ? Colors.white.withValues(alpha: 0.05) : AppTheme.accentCyan.withValues(alpha: 0.2)),
        ),
        child: SelectableText(
          message.text,
          style: TextStyle(color: isUser ? AppTheme.textMain : AppTheme.accentCyan, fontSize: 15, height: 1.4),
        ),
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              style: const TextStyle(color: AppTheme.textMain),
              decoration: InputDecoration(
                hintText: 'Ask for safety advice...',
                hintStyle: const TextStyle(color: AppTheme.textDim),
                filled: true,
                fillColor: AppTheme.bg.withValues(alpha: 0.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24.0),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 12),
          CircleAvatar(
            backgroundColor: AppTheme.accentCyan,
            radius: 24,
            child: IconButton(
              icon: const Icon(Icons.send_rounded, color: AppTheme.bg, size: 20),
              onPressed: _sendMessage,
            ),
          ),
        ],
      ),
    );
  }
}

class Message {
  final String text;
  final bool isUser;

  Message({required this.text, required this.isUser});
}
