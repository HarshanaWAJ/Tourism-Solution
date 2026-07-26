import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/socket_service.dart';
import '../../state/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_banner.dart';
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
      if (mounted) {
        setState(() => _error = e.toString());
      }
    }
  }

  Future<void> _listenForRequests() async {
    final socket = await SocketService.connect();
    socket.on('ride:request', (data) {
      if (mounted && data != null) {
        setState(() => _incomingRequest = Map<String, dynamic>.from(data as Map));
      }
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
      if (mounted) {
        setState(() => _error = e.toString());
      }
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
      } catch (_) {}
    });
  }

  Future<void> _acceptRequest() async {
    final nav = Navigator.of(context);
    final rideId = _incomingRequest?['rideId'] as String?;
    if (rideId == null) return;
    try {
      await ApiClient.request('/rides/$rideId/accept', method: 'POST');
      setState(() => _incomingRequest = null);
      if (!mounted) return;
      nav.push(MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: rideId, asDriver: true)));
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.verified_user_outlined, color: AppColors.primary),
            tooltip: 'Verification Documents',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DriverVerificationScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.textSecondary),
            tooltip: 'Log out',
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: _position ?? _kandy,
              initialZoom: 13,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.ceylonway.taxi',
              ),
              if (_position != null)
                MarkerLayer(markers: [
                  Marker(
                    point: _position!,
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
          ),

          // Top Status Header Panel
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: _verificationStatus != 'verified'
                  ? Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.warningBg,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.warning_amber_rounded, color: AppColors.warningText, size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Verification Pending',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                'Submit license docs to start accepting rides',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
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
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: _online ? AppColors.successText : AppColors.textMuted,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _online ? "You're Online" : "You're Offline",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: _online ? AppColors.successText : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                _online ? "Listening for nearby ride requests..." : "Toggle switch to go online",
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _online,
                          activeColor: AppColors.primary,
                          onChanged: _busy ? null : _toggleOnline,
                        ),
                      ],
                    ),
            ),
          ),

          // Bottom Error Overlay
          if (_error != null)
            Positioned(
              bottom: 20,
              left: 16,
              right: 16,
              child: CustomErrorBanner(
                message: _error!,
                onDismiss: () => setState(() => _error = null),
              ),
            ),
        ],
      ),

      // Ride Request Bottom Sheet
      bottomSheet: _incomingRequest == null
          ? null
          : Container(
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.notifications_active_rounded, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'New Ride Request!',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.successBg,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'LKR ${_incomingRequest?['fareEstimate'] ?? '0'}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.successText,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Pickup: ${_incomingRequest?['pickup']?['label'] ?? 'Nearby Tourist'}',
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _incomingRequest = null),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.textSecondary,
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                          child: const Text('Decline'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: _acceptRequest,
                          child: const Text('Accept Ride'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
