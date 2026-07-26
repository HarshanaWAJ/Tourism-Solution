# Ceylon Way Taxi — Flutter app

A single Flutter app for both tourists (book rides) and drivers (accept rides), talking to the
same backend as the web app under `../backend`.

## Important — this folder needs one manual setup step

This `mobile/` folder contains the app's `lib/` source and `pubspec.yaml`, but **not** the
native Android/iOS project scaffolding (that's binary/generated content `flutter create`
produces, and can't be generated in the environment this was written in). Before you can run
the app, do this once:

```bash
cd mobile
flutter create --org com.ceylonway --project-name ceylon_way_taxi .
```

Running `flutter create .` inside a folder that already has a `lib/` and `pubspec.yaml` is safe
— it fills in the missing `android/`, `ios/`, etc. folders without touching your existing Dart
code. If it prompts about overwriting `pubspec.yaml`, say no (or just re-check the dependency
list below still matches afterwards).

Then:

```bash
flutter pub get
```

## Required permissions (add these after `flutter create`)

**Android** — `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**iOS** — `ios/Runner/Info.plist`, inside the top-level `<dict>`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Ceylon Way Taxi needs your location to match you with nearby drivers and track rides.</string>
```

## Running it

The app needs to reach your backend, so point it at wherever `npm run dev` is listening
(see `../README.md` for backend setup):

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:4000/api \
  --dart-define=SOCKET_URL=http://10.0.2.2:4000 \
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

Notes on the URLs:
- `10.0.2.2` is the Android emulator's special alias for your host machine's `localhost` — use
  it if you're running the backend on the same computer as Android Studio's emulator.
- On a **physical phone**, use your computer's LAN IP instead (e.g. `192.168.1.42`), and make
  sure your phone and computer are on the same network.
- On the **iOS simulator**, `localhost` works directly (use `http://localhost:4000/api` instead
  of the `10.0.2.2` addresses).
- `STRIPE_PUBLISHABLE_KEY` is optional while testing cash-only rides — see the root
  `README.md` → "Stripe setup" for where to get it.

## What's in `lib/`

```
lib/
├── main.dart                        App entry point, Stripe init, theming
├── config.dart                      API_BASE_URL / SOCKET_URL / Stripe key (via --dart-define)
├── services/
│   ├── api_client.dart              REST calls + JWT token storage
│   └── socket_service.dart          Shared authenticated Socket.io connection
├── state/
│   └── auth_provider.dart           Logged-in user, session restore/logout
└── screens/
    ├── splash_screen.dart           Waits for session restore, then routes by role
    ├── role_select_screen.dart      Landing page: Log in / Sign up as Tourist / Sign up as Driver
    ├── login_screen.dart            One login form for both tourist and driver accounts
    ├── register_tourist_screen.dart
    ├── register_driver_screen.dart  Collects vehicle + license info
    ├── ride_tracking_screen.dart    Shared live map + status/payment actions (tourist & driver)
    ├── tourist/
    │   └── tourist_home_screen.dart Map, destination search, request a ride
    └── driver/
        ├── driver_home_screen.dart          Online toggle, live location, incoming requests
        └── driver_verification_screen.dart  Submit license/vehicle documents for review
```

## A note on this code's testing status

This was written carefully against current Flutter/Dart APIs, but couldn't be compiled or run
in the environment it was written in (no Flutter SDK available there). After `flutter pub get`,
run:

```bash
flutter analyze
```

and fix anything it flags — most likely candidates are minor API drift in `flutter_map`,
`geolocator`, or `flutter_stripe` if newer major versions have shipped since. The versions
pinned in `pubspec.yaml` were current as of this writing; if `flutter pub get` can't resolve
them, run `flutter pub outdated` and bump as needed.
