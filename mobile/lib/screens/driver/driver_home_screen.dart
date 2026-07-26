import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/socket_service.dart';
import '../../state/auth_provider.dart';
import '../ride_tracking_screen.dart';
import 'driver_verification_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  static const _kandy = ll.LatLng(7.2906, 80.6337);

  bool _online = false;
  bool _busy = false;
  String? _error;
  String _verificationStatus = 'unverified';
  ll.LatLng? _position;
  Map<String, dynamic>? _incomingRequest;
  StreamSubscription<Position>? _positionStream;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    super.dispose();
  }

  Future<void> _init() async {
    await _loadProfile();
    await _listenForRequests();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await ApiClient.request('/drivers/me/profile');
      final driver = res['driver'] as Map<String, dynamic>;
      setState(() {
        _online = driver['isOnline'] == true;
        _verificationStatus = driver['verificationStatus'] as String? ?? 'unverified';
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _listenForRequests() async {
    final socket = await SocketService.connect();
    socket.on('ride:request', (data) {
      if (mounted && data != null) setState(() => _incomingRequest = Map<String, dynamic>.from(data as Map));
    });
  }

  Future<void> _toggleOnline(bool value) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiClient.request('/drivers/me/status', method: 'PATCH', body: {'isOnline': value});
      setState(() => _online = value);
      if (value) {
        _startLocationUpdates();
      } else {
        _positionStream?.cancel();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _startLocationUpdates() {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(distanceFilter: 25),
    ).listen((pos) async {
      if (mounted) setState(() => _position = ll.LatLng(pos.latitude, pos.longitude));
      try {
        await ApiClient.request('/drivers/me/location', method: 'POST', body: {
          'lat': pos.latitude,
          'lng': pos.longitude,
        });
      } catch (_) {
        // A dropped ping isn't fatal — the next one will land.
      }
    });
  }

  Future<void> _acceptRequest() async {
    final rideId = _incomingRequest?['rideId'] as String?;
    if (rideId == null) return;
    try {
      await ApiClient.request('/rides/$rideId/accept', method: 'POST');
      setState(() => _incomingRequest = null);
      if (!mounted) return;
      Navigator.push(context, MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: rideId, asDriver: true)));
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver'),
        actions: [
          IconButton(
            icon: const Icon(Icons.badge_outlined),
            tooltip: 'Verification documents',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DriverVerificationScreen())),
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: () => context.read<AuthProvider>().logout()),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(initialCenter: _position ?? _kandy, initialZoom: 13),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.ceylonway.taxi',
              ),
              if (_position != null)
                MarkerLayer(markers: [
                  Marker(point: _position!, width: 40, height: 40, child: const Icon(Icons.local_taxi, color: Colors.teal, size: 32)),
                ]),
            ],
          ),
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: _verificationStatus != 'verified'
                    ? Row(
                        children: [
                          const Expanded(
                            child: Text('Your account isn\'t verified yet — submit your documents to go online.'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const DriverVerificationScreen()),
                            ),
                            child: const Text('Submit'),
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          Expanded(child: Text(_online ? "You're online — waiting for ride requests" : "You're offline")),
                          Switch(value: _online, onChanged: _busy ? null : _toggleOnline),
                        ],
                      ),
              ),
            ),
          ),
          if (_error != null)
            Positioned(
              bottom: 12,
              left: 12,
              right: 12,
              child: Card(
                color: Colors.red.shade50,
                child: Padding(padding: const EdgeInsets.all(12), child: Text(_error!)),
              ),
            ),
        ],
      ),
      bottomSheet: _incomingRequest == null
          ? null
          : Container(
              color: Theme.of(context).scaffoldBackgroundColor,
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('New ride request!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Pickup: ${_incomingRequest?['pickup']?['label'] ?? 'nearby'}'),
                  Text('Fare estimate: ${_incomingRequest?['currency']} ${_incomingRequest?['fareEstimate']}'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _incomingRequest = null),
                          child: const Text('Ignore'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: FilledButton(onPressed: _acceptRequest, child: const Text('Accept'))),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
