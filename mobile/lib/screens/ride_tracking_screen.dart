import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:flutter_stripe/flutter_stripe.dart';
import '../services/api_client.dart';
import '../services/socket_service.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_banner.dart';

class RideTrackingScreen extends StatefulWidget {
  final String rideId;
  final bool asDriver;

  const RideTrackingScreen({super.key, required this.rideId, required this.asDriver});

  @override
  State<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends State<RideTrackingScreen> {
  Map<String, dynamic>? _ride;
  ll.LatLng? _driverPosition;
  bool _busy = false;
  String? _error;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _joinSocket();
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) => _load());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    SocketService.socket?.emit('ride:leave', {'rideId': widget.rideId});
    super.dispose();
  }

  Future<void> _joinSocket() async {
    final socket = await SocketService.connect();
    socket.emit('ride:join', {'rideId': widget.rideId});
    socket.on('driver:location', (data) {
      if (!mounted || data == null) return;
      if (data['rideId'] == widget.rideId) {
        setState(() => _driverPosition = ll.LatLng(
              (data['lat'] as num).toDouble(),
              (data['lng'] as num).toDouble(),
            ));
      }
    });
    socket.on('ride:status', (data) {
      if (data != null && data['rideId'] == widget.rideId) _load();
    });
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.request('/rides/${widget.rideId}');
      if (mounted) setState(() => _ride = res['ride'] as Map<String, dynamic>?);
    } catch (_) {}
  }

  Future<void> _setStatus(String status) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiClient.request('/rides/${widget.rideId}/status', method: 'PATCH', body: {'status': status});
      await _load();
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _payByCard() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ApiClient.request('/rides/${widget.rideId}/payment-intent', method: 'POST');
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: res['clientSecret'] as String,
          merchantDisplayName: 'Ceylon Way Taxi',
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      await _load();
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Payment not completed: $e');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cashCollected() async {
    setState(() => _busy = true);
    try {
      await ApiClient.request('/rides/${widget.rideId}/cash-collected', method: 'POST');
      await _load();
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.asDriver ? 'Navigation & Trip' : 'Live Ride Tracking'),
      ),
      body: ride == null
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            )
          : Stack(
              children: [
                _buildMap(ride),

                // Bottom Panel Sheet
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.18),
                          blurRadius: 24,
                          offset: const Offset(0, -6),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Status & Fare Header Row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _StatusBadge(status: ride['status'] as String),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                '${ride['currency'] ?? 'LKR'} ${ride['fareFinal'] ?? ride['fareEstimate'] ?? '0'}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),

                        // Payment Details
                        Row(
                          children: [
                            Icon(
                              ride['paymentMode'] == 'card' ? Icons.credit_card_rounded : Icons.payments_rounded,
                              size: 18,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Payment: ${(ride['paymentMode'] as String).toUpperCase()} • Status: ${ride['paymentStatus']}',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Error Banner
                        if (_error != null)
                          CustomErrorBanner(
                            message: _error!,
                            onDismiss: () => setState(() => _error = null),
                          ),

                        // Action Buttons
                        ..._buildActions(ride),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildMap(Map<String, dynamic> ride) {
    final pickup = ll.LatLng(
      (ride['pickup']['lat'] as num).toDouble(),
      (ride['pickup']['lng'] as num).toDouble(),
    );
    final destination = ll.LatLng(
      (ride['destination']['lat'] as num).toDouble(),
      (ride['destination']['lng'] as num).toDouble(),
    );
    final routePoints = ((ride['routeGeometry'] as List?) ?? [])
        .map<ll.LatLng>((p) => ll.LatLng((p[1] as num).toDouble(), (p[0] as num).toDouble()))
        .toList();

    return FlutterMap(
      options: MapOptions(
        initialCenter: pickup,
        initialZoom: 13,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.ceylonway.taxi',
        ),
        if (routePoints.isNotEmpty)
          PolylineLayer(
            polylines: [
              Polyline(
                points: routePoints,
                strokeWidth: 4.5,
                color: AppColors.primary,
              ),
            ],
          ),
        MarkerLayer(markers: [
          Marker(
            point: pickup,
            width: 40,
            height: 40,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.trip_origin_rounded, color: Colors.white, size: 22),
            ),
          ),
          Marker(
            point: destination,
            width: 40,
            height: 40,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppColors.errorText,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 22),
            ),
          ),
          if (_driverPosition != null)
            Marker(
              point: _driverPosition!,
              width: 44,
              height: 44,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.4),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(Icons.local_taxi_rounded, color: Colors.white, size: 24),
              ),
            ),
        ]),
      ],
    );
  }

  List<Widget> _buildActions(Map<String, dynamic> ride) {
    final status = ride['status'] as String;

    if (widget.asDriver) {
      final actions = <Widget>[];
      if (status == 'accepted') {
        actions.add(FilledButton.icon(
          icon: const Icon(Icons.navigation_rounded),
          onPressed: _busy ? null : () => _setStatus('arriving'),
          label: const Text('Arriving at Pickup Location'),
        ));
      } else if (status == 'arriving') {
        actions.add(FilledButton.icon(
          icon: const Icon(Icons.play_arrow_rounded),
          onPressed: _busy ? null : () => _setStatus('in_progress'),
          label: const Text('Start Trip'),
        ));
      } else if (status == 'in_progress') {
        actions.add(FilledButton.icon(
          icon: const Icon(Icons.check_circle_rounded),
          onPressed: _busy ? null : () => _setStatus('completed'),
          label: const Text('Complete Trip'),
        ));
      } else if (status == 'completed' && ride['paymentMode'] == 'cash' && ride['paymentStatus'] != 'paid') {
        actions.add(FilledButton.icon(
          icon: const Icon(Icons.payments_rounded),
          onPressed: _busy ? null : _cashCollected,
          label: const Text('Confirm Cash Payment Received'),
        ));
      }
      return actions;
    }

    final actions = <Widget>[];
    if (status == 'searching') {
      actions.add(Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)),
            ),
            SizedBox(width: 12),
            Text('Finding a nearby driver…', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary)),
          ],
        ),
      ));
    }
    if (status == 'no_drivers_available') {
      actions.add(Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.warningBg,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Text('No drivers were available nearby. Please try again shortly.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.warningText)),
      ));
    }
    if (['searching', 'accepted'].contains(status)) {
      actions.add(OutlinedButton.icon(
        icon: const Icon(Icons.cancel_outlined),
        onPressed: _busy ? null : () => _setStatus('cancelled'),
        label: const Text('Cancel Ride'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.errorText,
          side: const BorderSide(color: AppColors.errorBorder),
        ),
      ));
    }
    if (ride['paymentMode'] == 'card' && ride['paymentStatus'] == 'pending' && status != 'cancelled') {
      actions.add(Padding(
        padding: const EdgeInsets.only(top: 8),
        child: FilledButton.icon(
          icon: const Icon(Icons.credit_card_rounded),
          onPressed: _busy ? null : _payByCard,
          label: const Text('Pay with Stripe Card'),
        ),
      ));
    }
    return actions;
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFFE2EAE8);
    Color text = AppColors.textPrimary;
    String label = status.replaceAll('_', ' ').toUpperCase();

    switch (status) {
      case 'searching':
        bg = const Color(0xFFDCEAE8);
        text = const Color(0xFF114B4B);
        break;
      case 'accepted':
      case 'arriving':
        bg = const Color(0xFFFBEFD4);
        text = const Color(0xFF9C6512);
        break;
      case 'in_progress':
        bg = const Color(0xFFDCEAE8);
        text = const Color(0xFF1C7A7A);
        break;
      case 'completed':
        bg = AppColors.successBg;
        text = AppColors.successText;
        break;
      case 'cancelled':
        bg = AppColors.errorBg;
        text = AppColors.errorText;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontWeight: FontWeight.bold,
          fontSize: 12,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
