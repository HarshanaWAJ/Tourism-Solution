import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:flutter_stripe/flutter_stripe.dart';
import '../services/api_client.dart';
import '../services/socket_service.dart';

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
    // Socket pushes are the primary channel; this polling timer is just a
    // safety net in case a push is missed (e.g. brief reconnect).
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
    } catch (_) {
      // Ignore transient errors on the background poll.
    }
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
      setState(() => _error = e.toString());
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
      setState(() => _error = 'Payment not completed: $e');
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
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    return Scaffold(
      appBar: AppBar(title: const Text('Ride')),
      body: ride == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(child: _buildMap(ride)),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Status: ${(ride['status'] as String).replaceAll('_', ' ')}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Fare: ${ride['currency']} ${ride['fareFinal'] ?? ride['fareEstimate']} · '
                        '${ride['paymentMode']} (${ride['paymentStatus']})',
                      ),
                      const SizedBox(height: 12),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(_error!, style: const TextStyle(color: Colors.red)),
                        ),
                      ..._buildActions(ride),
                    ],
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
      options: MapOptions(initialCenter: pickup, initialZoom: 13),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.ceylonway.taxi',
        ),
        if (routePoints.isNotEmpty)
          PolylineLayer(polylines: [Polyline(points: routePoints, strokeWidth: 4, color: Colors.teal)]),
        MarkerLayer(markers: [
          Marker(point: pickup, width: 36, height: 36, child: const Icon(Icons.trip_origin, color: Colors.teal)),
          Marker(point: destination, width: 36, height: 36, child: const Icon(Icons.location_on, color: Colors.red)),
          if (_driverPosition != null)
            Marker(
              point: _driverPosition!,
              width: 40,
              height: 40,
              child: const Icon(Icons.local_taxi, color: Colors.orange, size: 32),
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
        actions.add(FilledButton(
          onPressed: _busy ? null : () => _setStatus('arriving'),
          child: const Text('Mark: arriving at pickup'),
        ));
      } else if (status == 'arriving') {
        actions.add(FilledButton(
          onPressed: _busy ? null : () => _setStatus('in_progress'),
          child: const Text('Start trip'),
        ));
      } else if (status == 'in_progress') {
        actions.add(FilledButton(
          onPressed: _busy ? null : () => _setStatus('completed'),
          child: const Text('Complete trip'),
        ));
      } else if (status == 'completed' && ride['paymentMode'] == 'cash' && ride['paymentStatus'] != 'paid') {
        actions.add(FilledButton(onPressed: _busy ? null : _cashCollected, child: const Text('Confirm cash collected')));
      }
      return actions;
    }

    final actions = <Widget>[];
    if (status == 'searching') {
      actions.add(const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Center(child: Text('Looking for a nearby driver…')),
      ));
    }
    if (status == 'no_drivers_available') {
      actions.add(const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Center(child: Text('No drivers were available nearby. Try again shortly.')),
      ));
    }
    if (['searching', 'accepted'].contains(status)) {
      actions.add(OutlinedButton(onPressed: _busy ? null : () => _setStatus('cancelled'), child: const Text('Cancel ride')));
    }
    if (ride['paymentMode'] == 'card' && ride['paymentStatus'] == 'pending' && status != 'cancelled') {
      actions.add(FilledButton(onPressed: _busy ? null : _payByCard, child: const Text('Authorize card payment')));
    }
    return actions;
  }
}
