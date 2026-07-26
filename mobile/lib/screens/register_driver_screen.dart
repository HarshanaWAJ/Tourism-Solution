import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../state/auth_provider.dart';

class RegisterDriverScreen extends StatefulWidget {
  const RegisterDriverScreen({super.key});

  @override
  State<RegisterDriverScreen> createState() => _RegisterDriverScreenState();
}

class _RegisterDriverScreenState extends State<RegisterDriverScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _plateCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _licenseCtrl = TextEditingController();
  String _vehicleType = 'car';
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ApiClient.request(
        '/auth/register/driver',
        method: 'POST',
        auth: false,
        body: {
          'name': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'password': _passwordCtrl.text,
          'phone': _phoneCtrl.text.trim(),
          'vehicleType': _vehicleType,
          'vehiclePlate': _plateCtrl.text.trim(),
          'vehicleModel': _modelCtrl.text.trim(),
          'licenseNumber': _licenseCtrl.text.trim(),
        },
      );
      if (!mounted) return;
      await context.read<AuthProvider>().loginWithResult(res);
      Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign up — Driver')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
              controller: _emailCtrl,
              decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordCtrl,
              decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
              obscureText: true,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneCtrl,
              decoration: const InputDecoration(labelText: 'Phone', border: OutlineInputBorder()),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _vehicleType,
              decoration: const InputDecoration(labelText: 'Vehicle type', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'tuk_tuk', child: Text('Tuk-tuk')),
                DropdownMenuItem(value: 'car', child: Text('Car')),
                DropdownMenuItem(value: 'van', child: Text('Van')),
                DropdownMenuItem(value: 'bike', child: Text('Bike')),
              ],
              onChanged: (v) => setState(() => _vehicleType = v ?? _vehicleType),
            ),
            const SizedBox(height: 12),
            TextField(controller: _modelCtrl, decoration: const InputDecoration(labelText: 'Vehicle model', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _plateCtrl, decoration: const InputDecoration(labelText: 'License plate', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _licenseCtrl, decoration: const InputDecoration(labelText: 'Driving license number', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Text(_busy ? 'Creating account…' : 'Create account'),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "You'll be able to go online once an admin verifies your license and vehicle documents "
              "(submit them from the web portal for now — see README.md).",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
