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
import '../screens/download_progress_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    final serverHost = prefs.getString('serverHost') ?? '';
    final deviceId = prefs.getString('deviceId') ?? '';
    final hostApplicationId = prefs.getString('hostApplicationId') ?? '';
    final bypassPassword = prefs.getString('bypassPassword') ?? '';
    final tableNumber = prefs.getString('tableNumber') ?? '';
    final isActivated = token.isNotEmpty;

    debugPrint('[SPLASH_BOOTSTRAP] isActivated: $isActivated, deviceId: $deviceId, table: $tableNumber');

    if (!mounted) return;

    // Capture the Navigator before the callback fires. After the splash screen
    // is replaced, its BuildContext is unmounted and using it inside the
    // DeviceSetupScreen's onActivate callback throws "setState/mounted" errors.
    final splashNavigator = Navigator.of(context);

    splashNavigator.pushReplacement(
      MaterialPageRoute<void>(
        builder: (setupCtx) => isActivated
            ? KioskScreen(
                serverHost: serverHost,
                deviceId: deviceId,
                token: token,
                hostApplicationId: hostApplicationId,
                bypassPassword: bypassPassword,
                tableNumber: tableNumber,
                onReset: _rebootToSplash,
              )
            : DeviceSetupScreen(
                onActivate: (host, dId, tok, hAppId, pass, tblNum) {
                  // setupCtx is the DeviceSetupScreen's own context — it is
                  // mounted while the user is interacting with the setup form.
                  // Use it (captured fresh from the builder) instead of the
                  // outer splash context which is already unmounted.
                  Navigator.of(setupCtx).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => DownloadProgressScreen(
                        serverHost: host,
                        deviceId: dId,
                        token: tok,
                        hostApplicationId: hAppId,
                        bypassPassword: pass,
                        tableNumber: tblNum,
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
  await prefs.remove('tableNumber');
}
