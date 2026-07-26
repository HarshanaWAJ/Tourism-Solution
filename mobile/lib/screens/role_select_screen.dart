import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'register_tourist_screen.dart';
import 'register_driver_screen.dart';

/// This is the "same UI" entry point the tourist and driver flows both
/// start from. Login itself doesn't ask which kind of account it is — the
/// backend already knows from the account's role, and splash_screen.dart
/// routes to the right home screen after login based on that role.
/// Sign-up is the only place a role needs to be chosen up front, since the
/// two registration forms collect different information.
class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Ceylon Way Taxi',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Rides across Sri Lanka — for tourists and drivers, in one app.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 48),
              FilledButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                ),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text('Log in'),
                ),
              ),
              const SizedBox(height: 32),
              const Text('New here?', textAlign: TextAlign.center),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const RegisterTouristScreen()),
                ),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text("I'm a tourist — book rides"),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const RegisterDriverScreen()),
                ),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text("I'm a driver — earn by driving"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
