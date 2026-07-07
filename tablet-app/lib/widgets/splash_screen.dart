/// Full-screen splash displayed immediately on launch so the UI thread
/// is never blocked long enough to trigger an ANR.
///
/// All heavy initialisation (SharedPreferences I/O, gRPC channel setup,
/// directory scanning) is deferred to [WidgetsBinding.instance.addPostFrameCallback]
/// — the first frame with this widget renders within ~16 ms of `runApp()`.
library;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/kiosk_screen.dart';
import '../screens/device_setup_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // ═══ CRITICAL ANR FIX ═══
    // RunApp() delivers the first frame with this widget immediately (≈16 ms).
    // Then we bootstrap heavy I/O off the critical rendering path.
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    // ── 1. Load persisted state (disk I/O — safe after first frame) ──
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    final serverHost = prefs.getString('serverHost') ?? '';
    final deviceId = prefs.getString('deviceId') ?? '';
    final hostApplicationId = prefs.getString('hostApplicationId') ?? '';
    final bypassPassword = prefs.getString('bypassPassword') ?? '';
    final isActivated = token.isNotEmpty;

    debugPrint('[SPLASH_BOOTSTRAP] token: "$token", serverHost: "$serverHost", deviceId: "$deviceId", hostApplicationId: "$hostApplicationId", bypassPassword: "$bypassPassword", isActivated: $isActivated');

    if (!mounted) return;

    // ── 2. Transition to the real screen ──
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => isActivated
            ? KioskScreen(
                serverHost: serverHost,
                deviceId: deviceId,
                token: token,
                hostApplicationId: hostApplicationId,
                bypassPassword: bypassPassword,
                onReset: _rebootToSplash,
              )
            : DeviceSetupScreen(
                onActivate: (host, dId, tok, hAppId, pass) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => KioskScreen(
                        serverHost: host,
                        deviceId: dId,
                        token: tok,
                        hostApplicationId: hAppId,
                        bypassPassword: pass,
                        onReset: _rebootToSplash,
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  void _rebootToSplash() async {
    await resetCredentials();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => const SplashScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Splash image fills the screen
          Image.asset(
            'assets/SplashScreen.png',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
          // Subtle loading indicator at the bottom
          const Positioned(
            bottom: 80,
            left: 0,
            right: 0,
            child: Column(
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white54,
                  ),
                ),
                SizedBox(height: 12),
                Text(
                  'Preparing your experience…',
                  style: TextStyle(
                    color: Colors.white38,
                    fontSize: 13,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Clears stored credentials so the next launch returns to setup screen.
Future<void> resetCredentials() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('token');
  await prefs.remove('serverHost');
  await prefs.remove('deviceId');
  await prefs.remove('hostApplicationId');
  await prefs.remove('bypassPassword');
}
