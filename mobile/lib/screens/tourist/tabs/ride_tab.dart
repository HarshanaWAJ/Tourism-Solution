import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../../../services/api_client.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_banner.dart';
import '../../ride_tracking_screen.dart';

class RideTab extends StatefulWidget {
  const RideTab({super.key});

  @override
  State<RideTab> createState() => _RideTabState();
}

class _RideTabState extends State<RideTab> {
  static const _kandy = ll.LatLng(7.2906, 80.6337);

  ll.LatLng? _pickup;
  ll.LatLng? _destination;
  String _destinationLabel = '';
  final _searchCtrl = TextEditingController();
  String _vehicleType = 'car';
  String _paymentMode = 'cash';
  bool _requesting = false;
  String? _error;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _locateMe();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _locateMe() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw Exception('Location permission denied');
      }
      final pos = await Geolocator.getCurrentPosition();
      final point = ll.LatLng(pos.latitude, pos.longitude);
      setState(() => _pickup = point);
    } catch (_) {
      setState(() => _pickup = _kandy);
    }
  }

  Future<void> _searchDestination(String query) async {
    if (query.trim().length < 3) return;
    final uri = Uri.parse(
      'https://nominatim.openstreetmap.org/search'
      '?q=${Uri.encodeQueryComponent(query)}&format=json&limit=1&countrycodes=lk',
    );
    try {
      final res = await http.get(uri, headers: {'User-Agent': 'CeylonWayTaxi/1.0'});
      final results = jsonDecode(res.body) as List;
      if (results.isNotEmpty) {
        final r = results.first as Map<String, dynamic>;
        final point = ll.LatLng(double.parse(r['lat'] as String), double.parse(r['lon'] as String));
        setState(() {
          _destination = point;
          _destinationLabel = r['display_name'] as String;
          _error = null;
        });
        _mapController.move(point, 14);
      }
    } catch (_) {}
  }

  void _onLongPress(ll.LatLng point) {
    setState(() {
      _destination = point;
      _destinationLabel = 'Pinned Location (${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)})';
      _error = null;
    });
  }

  Future<void> _requestRide() async {
    final nav = Navigator.of(context);
    if (_pickup == null || _destination == null) {
      setState(() => _error = 'Please search a destination or long-press the map to drop a pin.');
      return;
    }
    setState(() {
      _requesting = true;
      _error = null;
    });
    try {
      final res = await ApiClient.request('/rides', method: 'POST', body: {
        'pickup': {'lat': _pickup!.latitude, 'lng': _pickup!.longitude, 'label': 'Current location'},
        'destination': {'lat': _destination!.latitude, 'lng': _destination!.longitude, 'label': _destinationLabel},
        'vehicleType': _vehicleType,
        'paymentMode': _paymentMode,
      });
      if (!mounted) return;
      final ride = res['ride'] as Map<String, dynamic>;
      nav.push(
        MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: ride['_id'] as String, asDriver: false)),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_pickup == null) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
        ),
      );
    }

    return Stack(
      children: [
        // Map Layer
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _pickup!,
            initialZoom: 14,
            onLongPress: (_, point) => _onLongPress(point),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.ceylonway.taxi',
            ),
            MarkerLayer(markers: [
              Marker(
                point: _pickup!,
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
                  child: const Icon(Icons.my_location_rounded, color: Colors.white, size: 24),
                ),
              ),
              if (_destination != null)
                Marker(
                  point: _destination!,
                  width: 44,
                  height: 44,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.errorText,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.errorText.withOpacity(0.4),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 24),
                  ),
                ),
            ]),
          ],
        ),

        // Floating Search Bar
        Positioned(
          top: 12,
          left: 16,
          right: 16,
          child: Container(
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
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search destination or long-press map…',
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _destination = null);
                        },
                      )
                    : null,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              onSubmitted: _searchDestination,
            ),
          ),
        ),

        // Bottom Sheet Controls
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_destinationLabel.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.pin_drop_rounded, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _destinationLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                if (_error != null)
                  CustomErrorBanner(
                    message: _error!,
                    onDismiss: () => setState(() => _error = null),
                  ),

                const Text(
                  'Select Vehicle Category',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 10),

                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _VehicleChip(
                        label: 'Tuk-Tuk',
                        icon: '🛺',
                        selected: _vehicleType == 'tuk_tuk',
                        onTap: () => setState(() => _vehicleType = 'tuk_tuk'),
                      ),
                      _VehicleChip(
                        label: 'Car',
                        icon: '🚗',
                        selected: _vehicleType == 'car',
                        onTap: () => setState(() => _vehicleType = 'car'),
                      ),
                      _VehicleChip(
                        label: 'Van',
                        icon: '🚐',
                        selected: _vehicleType == 'van',
                        onTap: () => setState(() => _vehicleType = 'van'),
                      ),
                      _VehicleChip(
                        label: 'Bike',
                        icon: '🏍️',
                        selected: _vehicleType == 'bike',
                        onTap: () => setState(() => _vehicleType = 'bike'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                SegmentedButton<String>(
                  style: SegmentedButton.styleFrom(
                    selectedBackgroundColor: AppColors.primary,
                    selectedForegroundColor: Colors.white,
                  ),
                  segments: const [
                    ButtonSegment(value: 'cash', label: Text('Cash'), icon: Icon(Icons.payments_rounded)),
                    ButtonSegment(value: 'card', label: Text('Stripe Card'), icon: Icon(Icons.credit_card_rounded)),
                  ],
                  selected: {_paymentMode},
                  onSelectionChanged: (s) => setState(() => _paymentMode = s.first),
                ),

                const SizedBox(height: 18),

                FilledButton(
                  onPressed: _requesting ? null : _requestRide,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 18),
                  ),
                  child: _requesting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.local_taxi_rounded, size: 22),
                            SizedBox(width: 8),
                            Text('Request Ride Now'),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _VehicleChip extends StatelessWidget {
  final String label;
  final String icon;
  final bool selected;
  final VoidCallback onTap;

  const _VehicleChip({
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
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withOpacity(0.1) : const Color(0xFFEEF6F5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? AppColors.primary : const Color(0xFFE2EAE8),
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                color: selected ? AppColors.primary : AppColors.textPrimary,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
