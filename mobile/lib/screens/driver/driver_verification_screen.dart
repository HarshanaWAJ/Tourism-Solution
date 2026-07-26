import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_banner.dart';

class DriverVerificationScreen extends StatefulWidget {
  const DriverVerificationScreen({super.key});

  @override
  State<DriverVerificationScreen> createState() =>
      _DriverVerificationScreenState();
}

class _DriverVerificationScreenState extends State<DriverVerificationScreen> {
  String _type = 'driving_license';
  final _urlCtrl = TextEditingController();
  final _issuedByCtrl = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _urlCtrl.dispose();
    _issuedByCtrl.dispose();
    super.dispose();
  }

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
      setState(() => _success = 'Document submitted successfully! An admin will review it shortly.');
      _urlCtrl.clear();
      _issuedByCtrl.clear();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Verification'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info Card Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.2),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.verified_user_rounded,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Submit Verification Documents',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Upload your license or insurance document to cloud storage (Google Drive, Dropbox, iCloud) and paste the link below.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.85),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Banners
              if (_error != null)
                CustomErrorBanner(
                  message: _error!,
                  onDismiss: () => setState(() => _error = null),
                ),
              if (_success != null)
                CustomSuccessBanner(
                  message: _success!,
                  onDismiss: () => setState(() => _success = null),
                ),

              // Document Form
              DropdownButtonFormField<String>(
                value: _type,
                decoration: const InputDecoration(
                  labelText: 'Document Type',
                  prefixIcon: Icon(Icons.file_present_rounded),
                ),
                items: const [
                  DropdownMenuItem(
                      value: 'driving_license', child: Text('🪪 Driving License')),
                  DropdownMenuItem(
                      value: 'vehicle_registration',
                      child: Text('📄 Vehicle Registration')),
                  DropdownMenuItem(
                      value: 'vehicle_insurance',
                      child: Text('🛡️ Vehicle Insurance')),
                  DropdownMenuItem(
                      value: 'id_document', child: Text('👤 National ID / Passport')),
                ],
                onChanged: (v) => setState(() => _type = v ?? _type),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _urlCtrl,
                decoration: const InputDecoration(
                  labelText: 'Document Shareable URL',
                  hintText: 'https://drive.google.com/file/...',
                  prefixIcon: Icon(Icons.link_rounded),
                ),
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _issuedByCtrl,
                decoration: const InputDecoration(
                  labelText: 'Issuing Authority (Optional)',
                  hintText: 'e.g. Department of Motor Traffic',
                  prefixIcon: Icon(Icons.account_balance_outlined),
                ),
                onSubmitted: (_) => _busy ? null : _submit(),
              ),

              const SizedBox(height: 28),

              FilledButton(
                onPressed: _busy ? null : _submit,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                ),
                child: _busy
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
                          Icon(Icons.upload_file_rounded, size: 20),
                          SizedBox(width: 8),
                          Text('Submit Document for Verification'),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
