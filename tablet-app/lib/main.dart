import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'constants.dart';
import 'widgets/splash_screen.dart';

// ═══════════════════════════════════════════════════════════════════
//  ENTRY POINT — Ultra-light to prevent ANR (>5 s main-thread block)
// ═══════════════════════════════════════════════════════════════════

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  // ══ FIRST FRAME in ≈16 ms — splash renders before ANY I/O ══
  runApp(const TabletopOrderingApp());
}

// ═══════════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════════

class TabletopOrderingApp extends StatefulWidget {
  const TabletopOrderingApp({super.key});

  @override
  State<TabletopOrderingApp> createState() => _TabletopOrderingAppState();
}

class _TabletopOrderingAppState extends State<TabletopOrderingApp> {
  static final ThemeData _lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: kAccentBlue,
    useMaterial3: true,
    scaffoldBackgroundColor: kScaffoldBg,
    cardTheme: const CardThemeData(
      color: kCardBg,
      elevation: 4,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: kCardBorderRadius),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: kTextDark,
      elevation: 0,
    ),
    colorScheme: const ColorScheme.light(
      primary: kAccentBlue,
      surface: kCardBg,
      onSurface: kTextDark,
    ),
  );

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tabletop Ordering Kiosk',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.light,
      theme: _lightTheme,
      home: const SplashScreen(),
    );
  }
}
