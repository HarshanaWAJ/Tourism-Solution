import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_banner.dart';

class AiAssistantTab extends StatefulWidget {
  const AiAssistantTab({super.key});

  @override
  State<AiAssistantTab> createState() => _AiAssistantTabState();
}

class _AiAssistantTabState extends State<AiAssistantTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Chat State
  final _chatCtrl = TextEditingController();
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'text': 'Ayubowan! 🙏 I am your AI Travel Guide for Sri Lanka. Ask me about top places, train rides, beaches, local food, or cultural tips!'
    }
  ];
  bool _chatBusy = false;

  // Itinerary Builder State
  int _days = 3;
  String _budget = 'medium';
  final Set<String> _selectedInterests = {'beach', 'culture'};
  bool _itineraryBusy = false;
  String? _itineraryError;
  Map<String, dynamic>? _generatedItinerary;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _chatCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _chatCtrl.text.trim();
    if (text.isEmpty) return;

    _chatCtrl.clear();
    setState(() {
      _messages.add({'role': 'user', 'text': text});
      _chatBusy = true;
    });

    try {
      final res = await ApiClient.request('/ai/chat', method: 'POST', body: {'message': text});
      final reply = res['reply'] as String? ?? 'I am here to help you plan your journey in Sri Lanka!';
      if (mounted) {
        setState(() {
          _messages.add({'role': 'assistant', 'text': reply});
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'text': 'Unable to connect to AI engine. Please ensure your backend service is online.'
          });
        });
      }
    } finally {
      if (mounted) setState(() => _chatBusy = false);
    }
  }

  Future<void> _generateItinerary() async {
    setState(() {
      _itineraryBusy = true;
      _itineraryError = null;
      _generatedItinerary = null;
    });

    try {
      final res = await ApiClient.request('/ai/itinerary', method: 'POST', body: {
        'days': _days,
        'interests': _selectedInterests.toList(),
        'budget': _budget,
      });

      if (mounted) {
        setState(() {
          _generatedItinerary = res;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _itineraryError = e.toString());
      }
    } finally {
      if (mounted) setState(() => _itineraryBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            color: Colors.white,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 24),
                ),
                const SizedBox(width: 14),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Travel Assistant',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Text(
                      'Smart Sri Lanka Trip Planner & Chat',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Tab Selection Bar
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Travel Chat'),
                Tab(text: 'Itinerary Planner'),
              ],
            ),
          ),

          // Tab Contents
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Chat View
                _buildChatView(),

                // Tab 2: Itinerary Builder View
                _buildItineraryView(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatView() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final msg = _messages[index];
              final isUser = msg['role'] == 'user';

              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                  decoration: BoxDecoration(
                    color: isUser ? AppColors.primary : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isUser ? 18 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 18),
                    ),
                  ),
                  child: Text(
                    msg['text'] ?? '',
                    style: TextStyle(
                      color: isUser ? Colors.white : AppColors.textPrimary,
                      fontSize: 14,
                      height: 1.35,
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        if (_chatBusy)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)),
                ),
                SizedBox(width: 10),
                Text('AI is generating response...', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ),

        // Chat Input Field
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _chatCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Ask AI about beaches, trains, food...',
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  onSubmitted: (_) => _chatBusy ? null : _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                icon: const Icon(Icons.send_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.all(14),
                ),
                onPressed: _chatBusy ? null : _sendMessage,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildItineraryView() {
    final itineraryData = _generatedItinerary;
    final planItems = (itineraryData?['itinerary'] as List?) ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Custom Trip Duration',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Slider(
                  value: _days.toDouble(),
                  min: 1,
                  max: 14,
                  divisions: 13,
                  activeColor: AppColors.primary,
                  label: '$_days Days',
                  onChanged: (v) => setState(() => _days = v.round()),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('$_days Days', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Text(
            'Your Interests',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _InterestFilterChip(label: '🏖️ Beach', value: 'beach', selected: _selectedInterests.contains('beach'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🏛️ Culture', value: 'culture', selected: _selectedInterests.contains('culture'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🐘 Safari', value: 'safari', selected: _selectedInterests.contains('safari'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🧗‍♂️ Hiking', value: 'hiking', selected: _selectedInterests.contains('hiking'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🍛 Food', value: 'food', selected: _selectedInterests.contains('food'), onSelected: _toggleInterest),
            ],
          ),

          const SizedBox(height: 20),
          FilledButton.icon(
            icon: const Icon(Icons.auto_awesome_rounded),
            onPressed: _itineraryBusy ? null : _generateItinerary,
            label: _itineraryBusy ? const Text('Generating Itinerary...') : const Text('Generate Sri Lanka Itinerary'),
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          ),

          const SizedBox(height: 20),
          if (_itineraryError != null)
            CustomErrorBanner(
              message: _itineraryError!,
              onDismiss: () => setState(() => _itineraryError = null),
            ),

          if (planItems.isNotEmpty) ...[
            const Divider(height: 32),
            const Text(
              'Your Tailored Itinerary',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
            ),
            const SizedBox(height: 14),
            ...planItems.map((item) {
              final day = item['day'] ?? 1;
              final title = item['title'] ?? item['notes'] ?? 'Explore Destination';
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('Day $day', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          if (item['notes'] != null) ...[
                            const SizedBox(height: 4),
                            Text(item['notes'].toString(), style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ],
      ),
    );
  }

  void _toggleInterest(String val) {
    setState(() {
      if (_selectedInterests.contains(val)) {
        _selectedInterests.remove(val);
      } else {
        _selectedInterests.add(val);
      }
    });
  }
}

class _InterestFilterChip extends StatelessWidget {
  final String label;
  final String value;
  final bool selected;
  final ValueChanged<String> onSelected;

  const _InterestFilterChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      selectedColor: AppColors.accent.withOpacity(0.2),
      checkmarkColor: AppColors.primary,
      onSelected: (_) => onSelected(value),
    );
  }
}
