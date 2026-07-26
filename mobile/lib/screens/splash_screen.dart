import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_provider.dart';
import 'role_select_screen.dart';
import 'tourist/tourist_home_screen.dart';
import 'driver/driver_home_screen.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.loading) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (auth.user == null) {
          return const RoleSelectScreen();
        }
        switch (auth.role) {
          case 'driver':
            return const DriverHomeScreen();
          case 'tourist':
            return const TouristHomeScreen();
          default:
            // Vendor/admin accounts belong on the web portal, not this app.
            return Scaffold(
              appBar: AppBar(title: const Text('Ceylon Way Taxi')),
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'This app is for tourists and drivers.\nUse the Ceylon Way web portal for vendor/admin accounts.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => context.read<AuthProvider>().logout(),
                        child: const Text('Log out'),
                      ),
                    ],
                  ),
                ),
              ),
            );
        }
      },
    );
  }
}
