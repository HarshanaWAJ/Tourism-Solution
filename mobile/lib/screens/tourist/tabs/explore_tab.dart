import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_banner.dart';

class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  final _searchCtrl = TextEditingController();
  String _selectedCategory = 'all';
  bool _loading = true;
  String? _error;
  List<dynamic> _listings = [];

  @override
  void initState() {
    super.initState();
    _fetchListings();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchListings() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final queryParams = <String>[];
      if (_searchCtrl.text.trim().isNotEmpty) {
        queryParams.add('query=${Uri.encodeComponent(_searchCtrl.text.trim())}');
      }
      if (_selectedCategory != 'all') {
        queryParams.add('category=${Uri.encodeComponent(_selectedCategory)}');
      }

      final path = queryParams.isEmpty ? '/listings' : '/listings?${queryParams.join('&')}';
      final res = await ApiClient.request(path, auth: false);
      if (mounted) {
        setState(() {
          _listings = res['results'] as List<dynamic>? ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openListingDetails(Map<String, dynamic> listing) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ListingDetailModal(listing: listing),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Top Search & Category Filter Section
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    hintText: 'Search hotels, tours, safari, scuba...',
                    prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded),
                            onPressed: () {
                              _searchCtrl.clear();
                              _fetchListings();
                            },
                          )
                        : null,
                  ),
                  onSubmitted: (_) => _fetchListings(),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _CategoryChip(
                        label: 'All',
                        icon: '🏝️',
                        selected: _selectedCategory == 'all',
                        onTap: () {
                          setState(() => _selectedCategory = 'all');
                          _fetchListings();
                        },
                      ),
                      _CategoryChip(
                        label: 'Hotels',
                        icon: '🏨',
                        selected: _selectedCategory == 'hotel',
                        onTap: () {
                          setState(() => _selectedCategory = 'hotel');
                          _fetchListings();
                        },
                      ),
                      _CategoryChip(
                        label: 'Tours',
                        icon: '🧗‍♂️',
                        selected: _selectedCategory == 'tour',
                        onTap: () {
                          setState(() => _selectedCategory = 'tour');
                          _fetchListings();
                        },
                      ),
                      _CategoryChip(
                        label: 'Activities',
                        icon: '🏄‍♂️',
                        selected: _selectedCategory == 'activity',
                        onTap: () {
                          setState(() => _selectedCategory = 'activity');
                          _fetchListings();
                        },
                      ),
                      _CategoryChip(
                        label: 'Packages',
                        icon: '📦',
                        selected: _selectedCategory == 'package',
                        onTap: () {
                          setState(() => _selectedCategory = 'package');
                          _fetchListings();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Main Listings View
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchListings,
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    )
                  : _error != null
                      ? Padding(
                          padding: const EdgeInsets.all(20),
                          child: CustomErrorBanner(
                            message: _error!,
                            onDismiss: () => setState(() => _error = null),
                          ),
                        )
                      : _listings.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search_off_rounded, size: 64, color: AppColors.textMuted),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No listings found in Sri Lanka',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Try adjusting your search query or filters',
                                    style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _listings.length,
                              itemBuilder: (context, index) {
                                final item = _listings[index] as Map<String, dynamic>;
                                return _ListingCard(
                                  listing: item,
                                  onTap: () => _openListingDetails(item),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final String icon;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 15)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                color: selected ? Colors.white : AppColors.textPrimary,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ListingCard extends StatelessWidget {
  final Map<String, dynamic> listing;
  final VoidCallback onTap;

  const _ListingCard({required this.listing, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final title = listing['title'] as String? ?? 'Experience';
    final category = (listing['category'] as String? ?? 'tour').toUpperCase();
    final price = listing['basePrice'] ?? 0;
    final currency = listing['currency'] as String? ?? 'LKR';
    final location = listing['location'] as Map<String, dynamic>?;
    final city = location?['city'] as String? ?? 'Sri Lanka';
    final images = (listing['images'] as List?) ?? [];
    final hasImage = images.isNotEmpty && (images.first as String).startsWith('http');

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Image Placeholder / Container
            Container(
              height: 140,
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                gradient: AppColors.primaryGradient,
                image: hasImage
                    ? DecorationImage(
                        image: NetworkImage(images.first as String),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        category,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$currency $price',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Card Body Details
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        city,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ListingDetailModal extends StatefulWidget {
  final Map<String, dynamic> listing;

  const _ListingDetailModal({required this.listing});

  @override
  State<_ListingDetailModal> createState() => _ListingDetailModalState();
}

class _ListingDetailModalState extends State<_ListingDetailModal> {
  int _partySize = 1;
  bool _loadingDetails = true;
  bool _bookingBusy = false;
  String? _modalError;
  String? _bookingSuccess;
  List<dynamic> _availabilitySlots = [];
  String? _selectedSlotId;

  @override
  void initState() {
    super.initState();
    _fetchSlots();
  }

  Future<void> _fetchSlots() async {
    try {
      final res = await ApiClient.request('/listings/${widget.listing['_id']}');
      if (mounted) {
        final slots = res['availability'] as List<dynamic>? ?? [];
        setState(() {
          _availabilitySlots = slots;
          if (slots.isNotEmpty) {
            _selectedSlotId = slots.first['_id'] as String?;
          }
        });
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loadingDetails = false);
    }
  }

  Future<void> _bookNow() async {
    if (_selectedSlotId == null) {
      setState(() => _modalError = 'No open availability slot available for booking.');
      return;
    }

    final String? provider = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Select Payment Option', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.credit_card_rounded, color: AppColors.primary),
              title: const Text('Credit Card (Stripe)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('Instant card checkout via Stripe', style: TextStyle(fontSize: 11)),
              onTap: () => Navigator.pop(ctx, 'stripe'),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.payments_rounded, color: Color(0xFFD97706)),
              title: const Text('Pay on Arrival / Cash', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('Guaranteed slot, pay directly at venue', style: TextStyle(fontSize: 11)),
              onTap: () => Navigator.pop(ctx, 'cash_on_arrival'),
            ),
          ],
        ),
      ),
    );

    if (provider == null) return;

    setState(() {
      _bookingBusy = true;
      _modalError = null;
      _bookingSuccess = null;
    });

    try {
      // Step 1: Create initial booking
      final res = await ApiClient.request(
        '/bookings',
        method: 'POST',
        body: {
          'listingId': widget.listing['_id'],
          'availabilitySlotId': _selectedSlotId,
          'partySize': _partySize,
        },
      );
      final bookingId = res['booking']?['_id'] as String?;

      if (bookingId != null) {
        // Step 2: Create payment intent on backend
        final intentRes = await ApiClient.request(
          '/payments/create-intent',
          method: 'POST',
          body: {
            'bookingId': bookingId,
            'provider': provider,
          },
        );

        // Step 3: Confirm payment
        final payRes = await ApiClient.request(
          '/payments',
          method: 'POST',
          body: {
            'bookingId': bookingId,
            'provider': provider,
            'paymentIntentId': intentRes['paymentIntentId'],
          },
        );

        if (mounted) {
          final code = payRes['booking']?['confirmationCode'] as String? ?? '';
          setState(() {
            _bookingSuccess = provider == 'cash_on_arrival'
                ? 'Reserved! Pay on Arrival code: $code'
                : 'Stripe Payment Successful! Confirmation Code: $code';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _modalError = e.toString());
      }
    } finally {
      if (mounted) setState(() => _bookingBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.listing['title'] as String? ?? 'Experience';
    final desc = widget.listing['description'] as String? ?? 'Discover amazing experiences in Sri Lanka.';
    final basePrice = widget.listing['basePrice'] ?? 0;
    final currency = widget.listing['currency'] as String? ?? 'LKR';
    final totalPrice = (basePrice as num) * _partySize;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
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
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_modalError != null)
                    CustomErrorBanner(
                      message: _modalError!,
                      onDismiss: () => setState(() => _modalError = null),
                    ),
                  if (_bookingSuccess != null)
                    CustomSuccessBanner(
                      message: _bookingSuccess!,
                      onDismiss: () => setState(() => _bookingSuccess = null),
                    ),

                  const Text(
                    'About this Experience',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    desc,
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                  ),
                  const SizedBox(height: 24),

                  const Text(
                    'Select Guests / Party Size',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      IconButton.outlined(
                        icon: const Icon(Icons.remove),
                        onPressed: _partySize > 1 ? () => setState(() => _partySize--) : null,
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Text(
                          '$_partySize ${_partySize == 1 ? "Guest" : "Guests"}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton.outlined(
                        icon: const Icon(Icons.add),
                        onPressed: () => setState(() => _partySize++),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                  const Text(
                    'Available Date & Time Slots',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),

                  _loadingDetails
                      ? const Center(child: CircularProgressIndicator())
                      : _availabilitySlots.isEmpty
                          ? Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.warningBg,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Text(
                                'No open date slots currently published by vendor.',
                                style: TextStyle(color: AppColors.warningText, fontSize: 13),
                              ),
                            )
                          : SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: _availabilitySlots.map((slot) {
                                  final slotId = slot['_id'] as String;
                                  final dateStr = slot['date'] != null
                                      ? DateTime.parse(slot['date'] as String).toLocal().toString().split(' ').first
                                      : 'Upcoming';
                                  final selected = _selectedSlotId == slotId;

                                  return GestureDetector(
                                    onTap: () => setState(() => _selectedSlotId = slotId),
                                    child: Container(
                                      margin: const EdgeInsets.only(right: 10),
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                      decoration: BoxDecoration(
                                        color: selected ? AppColors.primary : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Column(
                                        children: [
                                          Text(
                                            dateStr,
                                            style: TextStyle(
                                              color: selected ? Colors.white : AppColors.textPrimary,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${slot['capacityTotal'] - slot['capacityBooked']} spots left',
                                            style: TextStyle(
                                              color: selected ? Colors.white.withOpacity(0.8) : AppColors.textSecondary,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                ],
              ),
            ),
          ),

          // Bottom Fixed Price & Action Bar
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Total Fare', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    Text(
                      '$currency $totalPrice',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  icon: const Icon(Icons.auto_awesome_rounded, size: 16),
                  label: const Text('Plan Trip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    final location = widget.listing['location'] as Map<String, dynamic>?;
                    final city = location?['city'] as String? ?? 'Colombo';
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Open AI Assistant tab to plan trip for $city!'),
                        backgroundColor: AppColors.primary,
                        duration: const Duration(seconds: 3),
                      ),
                    );
                  },
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: (_bookingBusy || _selectedSlotId == null) ? null : _bookNow,
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                    child: _bookingBusy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.5, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                          )
                        : const Text('Book Now', style: TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
