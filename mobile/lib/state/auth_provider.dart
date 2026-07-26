import 'package:flutter/foundation.dart';
import '../services/api_client.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? user;
  bool loading = true;

  String? get role => user?['role'] as String?;

  Future<void> restoreSession() async {
    final token = await ApiClient.getToken();
    if (token == null) {
      loading = false;
      notifyListeners();
      return;
    }
    try {
      final res = await ApiClient.request('/auth/me');
      user = res['user'] as Map<String, dynamic>?;
    } catch (_) {
      await ApiClient.setToken(null);
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loginWithResult(Map<String, dynamic> result) async {
    await ApiClient.setToken(result['token'] as String?);
    user = result['user'] as Map<String, dynamic>?;
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiClient.setToken(null);
    SocketService.disconnect();
    user = null;
    notifyListeners();
  }
}
