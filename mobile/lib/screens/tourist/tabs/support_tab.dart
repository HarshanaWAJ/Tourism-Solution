import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../services/api_client.dart';
import '../../../state/auth_provider.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_banner.dart';

class SupportTab extends StatefulWidget {
  const SupportTab({super.key});

  @override
  State<SupportTab> createState() => _SupportTabState();
}

class _SupportTabState extends State<SupportTab> {
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  bool _submitting = false;
  bool _loadingTickets = true;
  String? _error;
  String? _success;
  List<dynamic> _tickets = [];

  @override
  void initState() {
    super.initState();
    _fetchTickets();
  }

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchTickets() async {
    setState(() {
      _loadingTickets = true;
      _error = null;
    });
    try {
      final res = await ApiClient.request('/support/tickets');
      if (mounted) {
        setState(() {
          _tickets = res['tickets'] as List<dynamic>? ?? [];
        });
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loadingTickets = false);
    }
  }

  Future<void> _submitTicket() async {
    final subject = _subjectCtrl.text.trim();
    final message = _messageCtrl.text.trim();

    if (subject.isEmpty || message.isEmpty) {
      setState(() => _error = 'Please enter both subject and message for your support ticket.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });

    try {
      await ApiClient.request('/support/tickets', method: 'POST', body: {
        'subject': subject,
        'message': message,
      });

      _subjectCtrl.clear();
      _messageCtrl.clear();

      setState(() {
        _success = 'Support ticket submitted! Our team will respond shortly.';
      });

      await _fetchTickets();
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User Profile Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.2),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.person_rounded, size: 36, color: Colors.white),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?['name'] as String? ?? 'Tourist Explorer',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?['email'] as String? ?? 'tourist@ceylonway.lk',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.85),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.accent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Tourist Account',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout_rounded, color: Colors.white),
                    onPressed: () => auth.logout(),
                    tooltip: 'Log out',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Submit Support Ticket Section
            const Text(
              'Submit a Support Request',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 6),
            const Text(
              'Need assistance with a ride, tour booking, or payment? Send us a message.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),

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

            TextField(
              controller: _subjectCtrl,
              decoration: const InputDecoration(
                labelText: 'Subject',
                hintText: 'e.g. Question about ride payment or tour booking',
                prefixIcon: Icon(Icons.subject_rounded),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _messageCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Message / Description',
                hintText: 'Describe your inquiry or issue...',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.send_rounded),
              onPressed: _submitting ? null : _submitTicket,
              label: _submitting ? const Text('Submitting Ticket...') : const Text('Submit Ticket'),
            ),

            const SizedBox(height: 32),

            // Support History List
            const Text(
              'Your Support History',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 14),

            _loadingTickets
                ? const Center(child: CircularProgressIndicator())
                : _tickets.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Text(
                          'No previous support tickets.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                        ),
                      )
                    : Column(
                        children: _tickets.map((t) {
                          final subject = t['subject'] as String? ?? 'Support Inquiry';
                          final status = t['status'] as String? ?? 'open';
                          final message = t['message'] as String? ?? '';
                          final response = t['response'] as String?;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        subject,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                      ),
                                    ),
                                    _TicketStatusPill(status: status),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  message,
                                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                ),
                                if (response != null && response.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.support_agent_rounded, color: AppColors.primary, size: 20),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            'Support Team: $response',
                                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.primary),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        }).toList(),
                      ),
          ],
        ),
      ),
    );
  }
}

class _TicketStatusPill extends StatelessWidget {
  final String status;
  const _TicketStatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFFFEF3C7);
    Color text = const Color(0xFFD97706);

    if (status == 'closed') {
      bg = AppColors.successBg;
      text = AppColors.successText;
    } else if (status == 'in_progress') {
      bg = const Color(0xFFE0F2FE);
      text = const Color(0xFF0284C7);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(status.replaceAll('_', ' ').toUpperCase(), style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 11)),
    );
  }
}
