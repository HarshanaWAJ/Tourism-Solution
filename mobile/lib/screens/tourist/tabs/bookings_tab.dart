import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_banner.dart';
import '../../ride_tracking_screen.dart';

class BookingsTab extends StatefulWidget {
  const BookingsTab({super.key});

  @override
  State<BookingsTab> createState() => _BookingsTabState();
}

class _BookingsTabState extends State<BookingsTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  bool _loadingRides = true;
  bool _loadingBookings = true;
  String? _error;

  List<dynamic> _rides = [];
  List<dynamic> _bookings = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchAllData() async {
    _fetchRides();
    _fetchBookings();
  }

  Future<void> _fetchRides() async {
    setState(() {
      _loadingRides = true;
      _error = null;
    });
    try {
      final res = await ApiClient.request('/rides/mine');
      if (mounted) {
        setState(() {
          _rides = res['rides'] as List<dynamic>? ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _loadingRides = false);
    }
  }

  Future<void> _fetchBookings() async {
    setState(() {
      _loadingBookings = true;
      _error = null;
    });
    try {
      final res = await ApiClient.request('/bookings/mine');
      if (mounted) {
        setState(() {
          _bookings = res['bookings'] as List<dynamic>? ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _loadingBookings = false);
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
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.confirmation_number_rounded, color: AppColors.primary, size: 24),
                ),
                const SizedBox(width: 14),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'My Bookings & Rides',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Text(
                      'Track all active and past activities',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Tab Bar
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Taxi Rides'),
                Tab(text: 'Hotels & Tours'),
              ],
            ),
          ),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: CustomErrorBanner(
                message: _error!,
                onDismiss: () => setState(() => _error = null),
              ),
            ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Taxi Rides
                RefreshIndicator(
                  onRefresh: _fetchRides,
                  child: _loadingRides
                      ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)))
                      : _rides.isEmpty
                          ? _buildEmptyState('No taxi rides yet', 'Book your first tuk-tuk or car ride!')
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _rides.length,
                              itemBuilder: (context, index) {
                                final ride = _rides[index] as Map<String, dynamic>;
                                return _RideCard(ride: ride);
                              },
                            ),
                ),

                // Tab 2: Hotel & Tour Bookings
                RefreshIndicator(
                  onRefresh: _fetchBookings,
                  child: _loadingBookings
                      ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)))
                      : _bookings.isEmpty
                          ? _buildEmptyState('No hotel or tour bookings', 'Explore experiences across Sri Lanka and book now!')
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _bookings.length,
                              itemBuilder: (context, index) {
                                final booking = _bookings[index] as Map<String, dynamic>;
                                return _BookingCard(booking: booking);
                              },
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.receipt_long_rounded, size: 60, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

class _RideCard extends StatelessWidget {
  final Map<String, dynamic> ride;

  const _RideCard({required this.ride});

  @override
  Widget build(BuildContext context) {
    final status = ride['status'] as String? ?? 'searching';
    final vehicle = (ride['vehicleType'] as String? ?? 'car').toUpperCase();
    final pickup = ride['pickup']?['label'] ?? 'Pickup point';
    final dest = ride['destination']?['label'] ?? 'Destination';
    final fare = ride['fareFinal'] ?? ride['fareEstimate'] ?? 0;
    final currency = ride['currency'] as String? ?? 'LKR';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RideTrackingScreen(rideId: ride['_id'] as String, asDriver: false),
            ),
          );
        },
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.local_taxi_rounded, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(vehicle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
                    ],
                  ),
                  _RideStatusPill(status: status),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.my_location_rounded, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(pickup.toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.location_on_rounded, size: 16, color: AppColors.errorText),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(dest.toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('$currency $fare', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                  const Row(
                    children: [
                      Text('Track Live', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.primary),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final Map<String, dynamic> booking;

  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    final listing = booking['listing'] as Map<String, dynamic>?;
    final title = listing?['title'] as String? ?? 'Experience Booking';
    final code = booking['confirmationCode'] as String? ?? 'LT-XXXXX';
    final price = booking['totalPrice'] ?? 0;
    final currency = booking['currency'] as String? ?? 'LKR';
    final partySize = booking['partySize'] ?? 1;
    final status = booking['status'] as String? ?? 'pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
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
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  code,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                ),
              ),
              _BookingStatusPill(status: status),
            ],
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$partySize ${partySize == 1 ? "Guest" : "Guests"}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              Text('$currency $price', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary)),
            ],
          ),
        ],
      ),
    );
  }
}

class _RideStatusPill extends StatelessWidget {
  final String status;
  const _RideStatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = AppColors.textPrimary;

    switch (status) {
      case 'completed':
        bg = AppColors.successBg;
        text = AppColors.successText;
        break;
      case 'in_progress':
      case 'accepted':
        bg = const Color(0xFFFEF3C7);
        text = const Color(0xFFD97706);
        break;
      case 'cancelled':
        bg = AppColors.errorBg;
        text = AppColors.errorText;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(status.replaceAll('_', ' ').toUpperCase(), style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 11)),
    );
  }
}

class _BookingStatusPill extends StatelessWidget {
  final String status;
  const _BookingStatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = AppColors.textPrimary;

    switch (status) {
      case 'confirmed':
        bg = AppColors.successBg;
        text = AppColors.successText;
        break;
      case 'pending_confirmation':
        bg = const Color(0xFFFEF3C7);
        text = const Color(0xFFD97706);
        break;
      case 'cancelled':
        bg = AppColors.errorBg;
        text = AppColors.errorText;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(status.replaceAll('_', ' ').toUpperCase(), style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 11)),
    );
  }
}
