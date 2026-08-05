import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class TripPlanDetailSheet extends StatelessWidget {
  final Map<String, dynamic> itinerary;

  const TripPlanDetailSheet({super.key, required this.itinerary});

  static void show(BuildContext context, Map<String, dynamic> itinerary) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TripPlanDetailSheet(itinerary: itinerary),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = itinerary['title'] as String? ?? 'Trip Plan';
    final items = (itinerary['items'] as List?) ?? [];
    final dailyWeather = (itinerary['dailyWeather'] as List?) ?? [];
    
    // Group items by day
    final Map<int, List<dynamic>> itemsByDay = {};
    for (var item in items) {
      final day = (item['day'] as num?)?.toInt() ?? 1;
      itemsByDay.putIfAbsent(day, () => []).add(item);
    }
    final sortedDays = itemsByDay.keys.toList()..sort();

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Header Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${items.length} Scheduled Stops · Weather-Optimised',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Body
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: sortedDays.length,
              itemBuilder: (context, index) {
                final dayNum = sortedDays[index];
                final dayItems = itemsByDay[dayNum] ?? [];
                
                // Find weather for this day
                Map<String, dynamic>? dayW;
                for (var w in dailyWeather) {
                  if ((w['day'] as num?)?.toInt() == dayNum) {
                    dayW = w as Map<String, dynamic>?;
                    break;
                  }
                }
                if (dayW == null && dayItems.isNotEmpty && dayItems.first['weather'] != null) {
                  dayW = dayItems.first['weather'] as Map<String, dynamic>?;
                }

                return Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2EAE8)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Day Weather Header Banner
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.06),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Day $dayNum',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ),
                                if (dayW != null) ...[
                                  Text(
                                    '${dayW['icon'] ?? ''} ${dayW['condition'] ?? ''}  (${dayW['tempMax']}° / ${dayW['tempMin']}°C)',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                                  ),
                                ],
                              ],
                            ),
                            if (dayW != null && dayW['recommendation'] != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                dayW['recommendation'].toString(),
                                style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                              ),
                            ],
                          ],
                        ),
                      ),

                      // Day Stops
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: dayItems.map((item) {
                            final travel = item['travelFromPrevious'] as Map<String, dynamic>?;
                            final travelDuration = travel?['durationText'] as String?;
                            final travelDistance = travel?['distanceText'] as String?;
                            final showTravel = travelDuration != null && travelDuration.isNotEmpty && (travel?['durationSeconds'] ?? 0) > 0;

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (showTravel) ...[
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 12, top: 4),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFBEFD4),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFEBBE5B)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.directions_car_rounded, size: 14, color: Color(0xFF9C6512)),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Travel: $travelDuration ($travelDistance)',
                                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF9C6512)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEEF6F5),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        item['startTime']?.toString() ?? 'Morning',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item['title']?.toString() ?? 'Activity',
                                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                          ),
                                          if (item['locationName'] != null) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              '📍 ${item['locationName']}',
                                              style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
                                            ),
                                          ],
                                          if (item['notes'] != null && item['notes'].toString().isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              item['notes'].toString(),
                                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.35),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
