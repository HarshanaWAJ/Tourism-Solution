import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_banner.dart';
import '../trip_plan_detail_sheet.dart';

class AiAssistantTab extends StatefulWidget {
  final String? initialCity;
  final String? initialListingId;

  const AiAssistantTab({
    super.key,
    this.initialCity,
    this.initialListingId,
  });

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
  final _cityCtrl = TextEditingController();
  DateTime _startDate = DateTime.now();
  int _days = 3;
  String _budget = 'medium';
  final Set<String> _selectedInterests = {'culture', 'beach', 'hiking'};
  final List<String> _selectedListingIds = [];
  
  bool _itineraryBusy = false;
  String? _itineraryError;
  Map<String, dynamic>? _generatedItinerary;

  // Live Weather Preview State
  bool _loadingWeather = false;
  List<dynamic> _weatherForecast = [];

  // Saved Trips State
  bool _loadingSavedTrips = false;
  List<dynamic> _savedTrips = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    if (widget.initialCity != null && widget.initialCity!.isNotEmpty) {
      _cityCtrl.text = widget.initialCity!;
    } else {
      _cityCtrl.text = 'Colombo';
    }

    if (widget.initialListingId != null && widget.initialListingId!.isNotEmpty) {
      _selectedListingIds.add(widget.initialListingId!);
      _tabController.animateTo(1);
    }

    _fetchWeatherForecast(_cityCtrl.text);
    _fetchSavedTrips();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _chatCtrl.dispose();
    _cityCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchWeatherForecast(String city) async {
    if (city.trim().isEmpty) return;
    setState(() => _loadingWeather = true);
    try {
      final res = await ApiClient.request('/ai/weather-forecast?city=${Uri.encodeComponent(city.trim())}', auth: false);
      if (mounted) {
        setState(() {
          _weatherForecast = res['forecast'] as List<dynamic>? ?? [];
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingWeather = false);
    }
  }

  Future<void> _fetchSavedTrips() async {
    setState(() => _loadingSavedTrips = true);
    try {
      final res = await ApiClient.request('/itineraries/mine');
      if (mounted) {
        setState(() {
          _savedTrips = res['itineraries'] as List<dynamic>? ?? [];
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingSavedTrips = false);
    }
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
    final city = _cityCtrl.text.trim();
    if (city.isEmpty) {
      setState(() => _itineraryError = 'Please enter a target city or region in Sri Lanka.');
      return;
    }

    setState(() {
      _itineraryBusy = true;
      _itineraryError = null;
      _generatedItinerary = null;
    });

    try {
      final endDate = _startDate.add(Duration(days: _days - 1));
      final res = await ApiClient.request('/ai/plan-trip', method: 'POST', body: {
        'city': city,
        'startDate': _startDate.toIso8601String().split('T').first,
        'endDate': endDate.toIso8601String().split('T').first,
        'interests': _selectedInterests.toList(),
        'selectedListingIds': _selectedListingIds,
        'budget': _budget,
      });

      if (mounted) {
        final itinerary = res['itinerary'] as Map<String, dynamic>?;
        setState(() {
          _generatedItinerary = itinerary;
        });
        _fetchSavedTrips();
        if (itinerary != null) {
          TripPlanDetailSheet.show(context, itinerary);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _itineraryError = e.toString());
      }
    } finally {
      if (mounted) setState(() => _itineraryBusy = false);
    }
  }

  Future<void> _selectStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _startDate = picked);
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
                      'Smart Sri Lanka Weather & Travel Planner',
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
                _buildChatView(),
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
                    color: isUser ? AppColors.primary : const Color(0xFFEEF6F5),
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
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Destination City Input
          const Text(
            'Target City or Region',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _cityCtrl,
            decoration: InputDecoration(
              hintText: 'e.g. Colombo, Kandy, Galle, Ella, Sigiriya',
              prefixIcon: const Icon(Icons.location_city_rounded, color: AppColors.primary),
              suffixIcon: IconButton(
                icon: const Icon(Icons.cloud_sync_rounded, color: AppColors.primary),
                onPressed: () => _fetchWeatherForecast(_cityCtrl.text),
              ),
            ),
            onChanged: (val) {
              if (val.length > 2) _fetchWeatherForecast(val);
            },
          ),

          const SizedBox(height: 16),

          // Weather Forecast Preview Strip
          if (_loadingWeather) ...[
            const Center(child: Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator(strokeWidth: 2))),
          ] else if (_weatherForecast.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF6F5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFDCEAE8)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.thunderstorm_rounded, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        'Live Weather Forecast: ${_cityCtrl.text}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _weatherForecast.map((w) {
                        return Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2EAE8)),
                          ),
                          child: Column(
                            children: [
                              Text(w['date'] ?? '', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                              Text(w['icon'] ?? '🌤️', style: const TextStyle(fontSize: 18)),
                              Text('${w['tempMax']}° / ${w['tempMin']}°C', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              Text('🌧️ ${w['rainProb']}%', style: const TextStyle(fontSize: 10, color: AppColors.primary)),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Start Date Selection & Duration
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Start Date', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: _selectStartDate,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF6F5),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2EAE8)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_month_rounded, size: 18, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Text(
                              '${_startDate.day}/${_startDate.month}/${_startDate.year}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Duration', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF6F5),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2EAE8)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          GestureDetector(
                            onTap: _days > 1 ? () => setState(() => _days--) : null,
                            child: const Icon(Icons.remove_circle_outline, size: 20, color: AppColors.primary),
                          ),
                          Text('$_days Days', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          GestureDetector(
                            onTap: _days < 14 ? () => setState(() => _days++) : null,
                            child: const Icon(Icons.add_circle_outline, size: 20, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Interests Multi-select Chips
          const Text(
            'Trip Preferences & Activities',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              _InterestFilterChip(label: '🏖️ Beach', value: 'beach', selected: _selectedInterests.contains('beach'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🏛️ Culture', value: 'culture', selected: _selectedInterests.contains('culture'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🧗‍♂️ Hiking', value: 'hiking', selected: _selectedInterests.contains('hiking'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🍛 Food', value: 'food', selected: _selectedInterests.contains('food'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🐘 Wildlife', value: 'wildlife', selected: _selectedInterests.contains('wildlife'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '🏄‍♂️ Surfing', value: 'surfing', selected: _selectedInterests.contains('surfing'), onSelected: _toggleInterest),
              _InterestFilterChip(label: '👨‍👩‍👧 Family', value: 'family-friendly', selected: _selectedInterests.contains('family-friendly'), onSelected: _toggleInterest),
            ],
          ),

          const SizedBox(height: 20),

          FilledButton.icon(
            icon: const Icon(Icons.auto_awesome_rounded),
            onPressed: _itineraryBusy ? null : _generateItinerary,
            label: _itineraryBusy ? const Text('Building Weather-Aware Plan...') : Text('Generate $_days-Day ${_cityCtrl.text} Plan'),
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          ),

          if (_itineraryError != null) ...[
            const SizedBox(height: 16),
            CustomErrorBanner(
              message: _itineraryError!,
              onDismiss: () => setState(() => _itineraryError = null),
            ),
          ],

          // Saved Trips List Section
          const Divider(height: 40),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Your Saved Trip Plans (${_savedTrips.length})',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, size: 20),
                onPressed: _fetchSavedTrips,
              ),
            ],
          ),
          const SizedBox(height: 8),

          _loadingSavedTrips
              ? const Center(child: CircularProgressIndicator())
              : _savedTrips.isEmpty
                  ? Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF6F5F0),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2EAE8)),
                      ),
                      child: const Center(
                        child: Text(
                          'No saved trip plans yet. Generate a plan above to automatically save!',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                        ),
                      ),
                    )
                  : Column(
                      children: _savedTrips.map((trip) {
                        final title = trip['title'] as String? ?? 'Trip Plan';
                        final itemCount = (trip['items'] as List?)?.length ?? 0;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2EAE8)),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.map_rounded, color: AppColors.primary, size: 22),
                            ),
                            title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            subtitle: Text('$itemCount stops scheduled', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
                            onTap: () => TripPlanDetailSheet.show(context, trip as Map<String, dynamic>),
                          ),
                        );
                      }).toList(),
                    ),
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
      label: Text(label, style: TextStyle(fontSize: 12, fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
      selected: selected,
      selectedColor: AppColors.accent.withOpacity(0.2),
      checkmarkColor: AppColors.primary,
      onSelected: (_) => onSelected(value),
    );
  }
}
