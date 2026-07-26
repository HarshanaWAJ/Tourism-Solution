import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ApiClient {
  static const _tokenKey = 'ceylonway_token';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> setToken(String? token) async {
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_tokenKey);
    } else {
      await prefs.setString(_tokenKey, token);
    }
  }

  static Future<Map<String, dynamic>> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    final encodedBody = body != null ? jsonEncode(body) : null;

    http.Response res;
    switch (method) {
      case 'POST':
        res = await http.post(uri, headers: headers, body: encodedBody);
        break;
      case 'PATCH':
        res = await http.patch(uri, headers: headers, body: encodedBody);
        break;
      case 'DELETE':
        res = await http.delete(uri, headers: headers, body: encodedBody);
        break;
      default:
        res = await http.get(uri, headers: headers);
    }

    Map<String, dynamic> data = {};
    if (res.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic>) data = decoded;
      } catch (_) {
        // Non-JSON body (e.g. an HTML error page from a proxy) — fall
        // through with an empty map so the status-code check below fires.
      }
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException((data['error'] as String?) ?? 'Request failed (${res.statusCode})');
    }
    return data;
  }
}
