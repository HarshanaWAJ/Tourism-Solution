/// Central place for environment-specific values. Override at build/run
/// time with --dart-define, e.g.:
///
///   flutter run \
///     --dart-define=API_BASE_URL=http://192.168.1.50:4000/api \
///     --dart-define=SOCKET_URL=http://192.168.1.50:4000 \
///     --dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_xxx
///
/// The defaults below assume the Android emulator talking to a backend
/// running on your host machine (10.0.2.2 is the emulator's alias for
/// "localhost" on the host). On a physical device, use your computer's LAN
/// IP address instead.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api',
  );

  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  // See README.md → "Stripe setup" for how to get a publishable key.
  static const String stripePublishableKey = String.fromEnvironment(
    'STRIPE_PUBLISHABLE_KEY',
    defaultValue: '',
  );
}
