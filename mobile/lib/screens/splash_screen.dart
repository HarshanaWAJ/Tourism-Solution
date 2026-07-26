import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_provider.dart';
import '../theme/app_theme.dart';
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
          return Scaffold(
            body: Container(
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.local_taxi_rounded,
                        size: 64,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Ceylon Way Taxi',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your Premium Gateway to Paradise',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 48),
                    const SizedBox(
                      width: 32,
                      height: 32,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
                        strokeWidth: 3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
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
                        style: TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        icon: const Icon(Icons.logout_rounded),
                        onPressed: () => context.read<AuthProvider>().logout(),
                        label: const Text('Log out'),
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
