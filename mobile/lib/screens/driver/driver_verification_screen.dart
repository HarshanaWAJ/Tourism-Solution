import 'package:flutter/material.dart';
import '../services/api_client.dart';

class DriverVerificationScreen extends StatefulWidget {
  const DriverVerificationScreen({super.key});

  @override
  State<DriverVerificationScreen> createState() => _DriverVerificationScreenState();
}

class _DriverVerificationScreenState extends State<DriverVerificationScreen> {
  String _type = 'driving_license';
  final _urlCtrl = TextEditingController();
  final _issuedByCtrl = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _success;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
      _success = null;
    });
    try {
      await ApiClient.request(
        '/drivers/me/verification-documents',
        method: 'POST',
        body: {
          'type': _type,
          'fileUrl': _urlCtrl.text.trim(),
          'issuedBy': _issuedByCtrl.text.trim(),
        },
      );
      setState(() => _success = 'Submitted — an admin will review it shortly.');
      _urlCtrl.clear();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verification documents')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Upload your document to any file host (Google Drive, Dropbox, etc.), '
              'make the link viewable, and paste it below.',
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Document type', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'driving_license', child: Text('Driving license')),
                DropdownMenuItem(value: 'vehicle_registration', child: Text('Vehicle registration')),
                DropdownMenuItem(value: 'vehicle_insurance', child: Text('Vehicle insurance')),
                DropdownMenuItem(value: 'id_document', child: Text('ID document')),
              ],
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _urlCtrl,
              decoration: const InputDecoration(labelText: 'Document URL', border: OutlineInputBorder()),
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _issuedByCtrl,
              decoration: const InputDecoration(labelText: 'Issued by (optional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_success != null) Text(_success!, style: const TextStyle(color: Colors.teal)),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Text(_busy ? 'Submitting…' : 'Submit for review'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
