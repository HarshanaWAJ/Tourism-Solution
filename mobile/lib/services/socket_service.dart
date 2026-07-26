import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config.dart';
import 'api_client.dart';

class SocketService {
  static io.Socket? _socket;

  static io.Socket? get socket => _socket;

  /// Connects (or reuses) a single authenticated socket for the app's
  /// lifetime. Call this once you're logged in; safe to call repeatedly.
  static Future<io.Socket> connect() async {
    if (_socket != null && _socket!.connected) return _socket!;

    _socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder().setTransports(['websocket']).build(),
    );

    _socket!.onConnect((_) async {
      final token = await ApiClient.getToken();
      if (token != null) _socket!.emit('auth', {'token': token});
    });

    return _socket!;
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
