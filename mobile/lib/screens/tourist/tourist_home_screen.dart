import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../state/auth_provider.dart';
import '../ride_tracking_screen.dart';

class TouristHomeScreen extends StatefulWidget {
  const TouristHomeScreen({super.key});

  @override
  State<TouristHomeScreen> createState() => _TouristHomeScreenState();
}

class _TouristHomeScreenState extends State<TouristHomeScreen> {
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
      setState(() => _pickup = ll.LatLng(pos.latitude, pos.longitude));
    } catch (_) {
      // Fall back to a Sri Lanka-wide default center if location is unavailable.
      setState(() => _pickup = _kandy);
    }
  }

  /// Uses OSM's Nominatim search (no API key). Please respect Nominatim's
  /// usage policy for anything beyond light development use — see README.md.
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
        });
        _mapController.move(point, 13);
      }
    } catch (_) {
      // The user can still long-press the map to drop a pin manually.
    }
  }

  void _onLongPress(ll.LatLng point) {
    setState(() {
      _destination = point;
      _destinationLabel = 'Dropped pin';
    });
  }

  Future<void> _requestRide() async {
    if (_pickup == null || _destination == null) {
      setState(() => _error = 'Set a pickup and destination first.');
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
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: ride['_id'] as String, asDriver: false)),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book a ride'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: () => context.read<AuthProvider>().logout()),
        ],
      ),
      body: _pickup == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'Search a destination, or long-press the map',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: _searchDestination,
                  ),
                ),
                Expanded(
                  child: FlutterMap(
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
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.my_location, color: Colors.teal, size: 32),
                        ),
                        if (_destination != null)
                          Marker(
                            point: _destination!,
                            width: 40,
                            height: 40,
                            child: const Icon(Icons.location_on, color: Colors.red, size: 36),
                          ),
                      ]),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        spacing: 8,
                        children: ['tuk_tuk', 'car', 'van', 'bike'].map((v) {
                          return ChoiceChip(
                            label: Text(v.replaceAll('_', ' ')),
                            selected: _vehicleType == v,
                            onSelected: (_) => setState(() => _vehicleType = v),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 8),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'cash', label: Text('Cash'), icon: Icon(Icons.payments)),
                          ButtonSegment(value: 'card', label: Text('Card'), icon: Icon(Icons.credit_card)),
                        ],
                        selected: {_paymentMode},
                        onSelectionChanged: (s) => setState(() => _paymentMode = s.first),
                      ),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(_error!, style: const TextStyle(color: Colors.red)),
                        ),
                      const SizedBox(height: 8),
                      FilledButton(
                        onPressed: _requesting ? null : _requestRide,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          child: Text(_requesting ? 'Finding a driver…' : 'Request ride'),
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
