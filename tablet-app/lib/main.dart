import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:grpc/grpc.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:fixnum/fixnum.dart';

import 'generated/device.pbgrpc.dart';
import 'generated/menu.pbgrpc.dart';
import 'generated/order.pbgrpc.dart';

import 'constants.dart';
import 'menu_state.dart';
import 'ad_player_service.dart';
import 'ad_sync_service.dart';
import 'widgets/ad_view.dart';
import 'widgets/menu_catalog.dart';
import 'widgets/order_summary.dart';
import 'widgets/checkout_modal.dart';

// ═══════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token') ?? '';
  final serverHost = prefs.getString('serverHost') ?? '';
  final deviceId = prefs.getString('deviceId') ?? '';
  final hostApplicationId = prefs.getString('hostApplicationId') ?? '';
  final bypassPassword = prefs.getString('bypassPassword') ?? '';

  runApp(TabletopOrderingApp(
    initialActivated: token.isNotEmpty,
    initialServerHost: serverHost,
    initialDeviceId: deviceId,
    initialToken: token,
    initialHostApplicationId: hostApplicationId,
    initialBypassPassword: bypassPassword,
  ));
}

// ═══════════════════════════════════════════════════════════════════
//  ROOT APP — Theme management
// ═══════════════════════════════════════════════════════════════════

class TabletopOrderingApp extends StatefulWidget {
  final bool initialActivated;
  final String initialServerHost;
  final String initialDeviceId;
  final String initialToken;
  final String initialHostApplicationId;
  final String initialBypassPassword;

  const TabletopOrderingApp({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
    required this.initialBypassPassword,
  });

  @override
  State<TabletopOrderingApp> createState() => _TabletopOrderingAppState();
}

class _TabletopOrderingAppState extends State<TabletopOrderingApp> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

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
      home: MainDeviceRouter(
        initialActivated: widget.initialActivated,
        initialServerHost: widget.initialServerHost,
        initialDeviceId: widget.initialDeviceId,
        initialToken: widget.initialToken,
        initialHostApplicationId: widget.initialHostApplicationId,
        initialBypassPassword: widget.initialBypassPassword,
        toggleTheme: () {},
        currentThemeMode: ThemeMode.light,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
//  DEVICE ROUTER — Switches between setup and kiosk screens
// ═══════════════════════════════════════════════════════════════════

class MainDeviceRouter extends StatefulWidget {
  final bool initialActivated;
  final String initialServerHost;
  final String initialDeviceId;
  final String initialToken;
  final String initialHostApplicationId;
  final String initialBypassPassword;
  final VoidCallback toggleTheme;
  final ThemeMode currentThemeMode;

  const MainDeviceRouter({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
    required this.initialBypassPassword,
    required this.toggleTheme,
    required this.currentThemeMode,
  });

  @override
  State<MainDeviceRouter> createState() => _MainDeviceRouterState();
}

class _MainDeviceRouterState extends State<MainDeviceRouter> {
  bool _isActivated = false;
  String _serverHost = '';
  String _deviceId = '';
  String _token = '';
  String _hostApplicationId = '';
  String _bypassPassword = '';

  @override
  void initState() {
    super.initState();
    _isActivated = widget.initialActivated;
    _serverHost = widget.initialServerHost;
    _deviceId = widget.initialDeviceId;
    _token = widget.initialToken;
    _hostApplicationId = widget.initialHostApplicationId;
    _bypassPassword = widget.initialBypassPassword;
  }

  void _onActivate(String serverHost, String deviceId, String token,
      String hostApplicationId, String password) {
    setState(() {
      _serverHost = serverHost;
      _deviceId = deviceId;
      _token = token;
      _hostApplicationId = hostApplicationId;
      _bypassPassword = password;
      _isActivated = true;
    });
  }

  void _onReset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('serverHost');
    await prefs.remove('deviceId');
    await prefs.remove('hostApplicationId');
    await prefs.remove('bypassPassword');
    await prefs.remove('isLightTheme');

    setState(() {
      _isActivated = false;
      _serverHost = '';
      _deviceId = '';
      _token = '';
      _hostApplicationId = '';
      _bypassPassword = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isActivated) {
      return DeviceSetupScreen(
        onActivate: _onActivate,
        toggleTheme: widget.toggleTheme,
        currentThemeMode: widget.currentThemeMode,
      );
    }
    return KioskScreen(
      serverHost: _serverHost,
      deviceId: _deviceId,
      token: _token,
      hostApplicationId: _hostApplicationId,
      bypassPassword: _bypassPassword,
      onReset: _onReset,
      toggleTheme: widget.toggleTheme,
      currentThemeMode: widget.currentThemeMode,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
//  DEVICE SETUP SCREEN — One-time activation
// ═══════════════════════════════════════════════════════════════════

class DeviceSetupScreen extends StatefulWidget {
  final Function(String, String, String, String, String) onActivate;
  final VoidCallback toggleTheme;
  final ThemeMode currentThemeMode;

  const DeviceSetupScreen({
    super.key,
    required this.onActivate,
    required this.toggleTheme,
    required this.currentThemeMode,
  });

  @override
  State<DeviceSetupScreen> createState() => _DeviceSetupScreenState();
}

class _DeviceSetupScreenState extends State<DeviceSetupScreen> {
  final _serverHostController = TextEditingController(text: '10.0.2.2');
  final _deviceIdController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String _error = '';
  bool _loading = false;

  @override
  void dispose() {
    _serverHostController.dispose();
    _deviceIdController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _submit() async {
    setState(() {
      _error = '';
      _loading = true;
    });

    final serverHost = _serverHostController.text.trim();
    final deviceId = _deviceIdController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (serverHost.isEmpty ||
        deviceId.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty) {
      setState(() {
        _error = 'All fields are required';
        _loading = false;
      });
      return;
    }

    if (password.length < 4 || password.length > 12) {
      setState(() {
        _error = 'Bypass password must be 4-12 characters';
        _loading = false;
      });
      return;
    }

    if (password != confirmPassword) {
      setState(() {
        _error = 'Passwords do not match';
        _loading = false;
      });
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      String? hardwareId = prefs.getString('hardware_id');
      if (hardwareId == null) {
        hardwareId =
            'hw_tab_${DateTime.now().millisecondsSinceEpoch}_$deviceId';
        await prefs.setString('hardware_id', hardwareId);
      }

      final url = Uri.parse(
          'http://$serverHost:4200/api/v1/auth/device/activate');
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'deviceId': deviceId,
              'hardwareId': hardwareId,
              'deviceType': 'tablet',
              'kioskPassword': password,
            }),
          )
          .timeout(kHttpTimeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['data']['token'];
        final hostApplicationId = data['data']['hostApplicationId'];

        await prefs.setString('serverHost', serverHost);
        await prefs.setString('deviceId', deviceId);
        await prefs.setString('token', token);
        await prefs.setString('hostApplicationId', hostApplicationId);
        await prefs.setString('bypassPassword', password);

        widget.onActivate(
            serverHost, deviceId, token, hostApplicationId, password);
      } else {
        setState(() {
          _error = data['message'] ?? 'Activation failed';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error =
            'Connection failed: Ensure server is running and IP is correct';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              widget.currentThemeMode == ThemeMode.light
                  ? Icons.dark_mode_outlined
                  : Icons.light_mode_outlined,
            ),
            onPressed: widget.toggleTheme,
            tooltip: "Toggle Light/Dark Theme",
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        color: kScaffoldBg,
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              width: 450,
              padding: kSetupCardPadding,
              decoration: const BoxDecoration(
                color: kCardBg,
                borderRadius: BorderRadius.all(Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  )
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.settings_suggest_rounded,
                      size: 64, color: Colors.blueAccent),
                  const SizedBox(height: 16),
                  const Text("Kiosk Tablet Setup",
                      textAlign: TextAlign.center, style: kSetupTitleStyle),
                  const SizedBox(height: 8),
                  const Text(
                    "One-time authorization setup for tabletop display device.",
                    textAlign: TextAlign.center,
                    style: kSetupSubtitleStyle,
                  ),
                  const SizedBox(height: 24),
                  if (_error.isNotEmpty) ...[
                    Container(
                      padding: kCardPadding,
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withValues(alpha: 0.1),
                        borderRadius: kInputBorderRadius,
                        border: Border.all(
                            color: Colors.redAccent.withValues(alpha: 0.2)),
                      ),
                      child: Text(_error, style: kErrorTextStyle),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _serverHostController,
                    decoration: InputDecoration(
                      labelText: "Server Host / IP",
                      helperText:
                          "e.g. 10.0.2.2 (Emulator) or 192.168.1.X (Local Wifi)",
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lan_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _deviceIdController,
                    decoration: InputDecoration(
                      labelText: "Device ID (e.g. DEV_TAB_XXXX)",
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.tablet_android_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: "Set Bypass Password",
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lock_open_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: "Confirm Bypass Password",
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text("Authorize & Bind Device",
                            style:
                                TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
//  KIOSK SCREEN — Main kiosk orchestrator
// ═══════════════════════════════════════════════════════════════════

class KioskScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final VoidCallback onReset;
  final VoidCallback toggleTheme;
  final ThemeMode currentThemeMode;

  const KioskScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.onReset,
    required this.toggleTheme,
    required this.currentThemeMode,
  });

  @override
  State<KioskScreen> createState() => _KioskScreenState();
}

class _KioskScreenState extends State<KioskScreen> {
  // ── Screen-level state (legitimate root setState targets) ──
  bool _isIdle = true;
  bool _showCart = false;
  String _outletName = 'Aster & Ice';
  String _selectedCategory = '';

  // ── gRPC ──
  late ClientChannel _channel;
  late DeviceServiceClient _deviceClient;
  late MenuServiceClient _menuClient;
  late OrderServiceClient _orderClient;
  late CallOptions _callOptions;
  Timer? _heartbeatTimer;

  // ── Decoupled services ──
  late final AdPlayerService _adPlayer;
  late final AdSyncService _adSync;
  final CartNotifier _cart = CartNotifier();
  final MenuNotifier _menu = MenuNotifier();

  // ── Timers ──
  Timer? _inactivityTimer;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    _initGrpc();
    _registerAndStartHeartbeat();
    _fetchMenu();

    // Initialize ad services
    _adPlayer = AdPlayerService(
      onImpression: _trackAdImpression,
    );

    _adSync = AdSyncService(
      serverHost: widget.serverHost,
      token: widget.token,
      adsDirectory: kAdsDirectoryPath,
      onPlaylistUpdated: _onPlaylistUpdated,
    );

    _bootAds();
  }

  void _initGrpc() {
    _channel = ClientChannel(
      widget.serverHost,
      port: 4201,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );

    _deviceClient = DeviceServiceClient(_channel);
    _menuClient = MenuServiceClient(_channel);
    _orderClient = OrderServiceClient(_channel);

    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: kHttpTimeout,
    );
  }

  void _registerAndStartHeartbeat() async {
    try {
      final req = RegisterDeviceRequest()
        ..deviceId = widget.deviceId
        ..deviceType = 'tablet'
        ..hostApplicationId = widget.hostApplicationId;

      await _deviceClient.registerDevice(req, options: _callOptions);
      debugPrint('gRPC Device registered successfully');
    } catch (e) {
      debugPrint('gRPC Device registration failed: $e');
    }

    _heartbeatTimer =
        Timer.periodic(kHeartbeatInterval, (timer) async {
      try {
        await _deviceClient.sendHeartbeat(
            HeartbeatRequest()..deviceId = widget.deviceId,
            options: _callOptions);
      } catch (e) {
        debugPrint('gRPC Heartbeat failed: $e');
      }
    });
  }

  void _fetchMenu() async {
    _menu.setLoading();

    try {
      final req = GetMenuRequest()
        ..deviceId = widget.deviceId
        ..merchantId = '';

      final response = await _menuClient.getMenu(req, options: _callOptions);

      if (mounted) {
        setState(() {
          _outletName = response.message.isNotEmpty ? response.message : 'Aster & Ice';
          if (_selectedCategory.isEmpty && response.items.isNotEmpty) {
            _selectedCategory = response.items.first.category;
          }
        });
        _menu.setItems(response.items);
      }
    } catch (e) {
      if (mounted) {
        _menu.setError();
        _loadMockFallbackMenu();
      }
    }
  }

  void _loadMockFallbackMenu() {
    final mockItems = [
      MenuItem()
        ..itemId = 'item_fallback_1'
        ..name = 'Pepperoni Pizza Grande'
        ..description = 'Extra cheese, fresh basil on a wood-fired crust'
        ..price = Int64(44900)
        ..category = 'Main Course'
        ..isAvailable = true,
      MenuItem()
        ..itemId = 'item_fallback_2'
        ..name = 'Crispy French Fries'
        ..description = 'With parmesan & garlic rosemary mayo dip'
        ..price = Int64(22900)
        ..category = 'Starters'
        ..isAvailable = true,
      MenuItem()
        ..itemId = 'item_fallback_3'
        ..name = 'Cheeseburger Deluxe'
        ..description = 'Flame grilled double beef patty, brioche bun'
        ..price = Int64(29900)
        ..category = 'Main Course'
        ..isAvailable = true,
      MenuItem()
        ..itemId = 'item_fallback_4'
        ..name = 'Iced Hazelnut Latte'
        ..description = 'Double fresh espresso shot, cold micro foam'
        ..price = Int64(17900)
        ..category = 'Beverages'
        ..isAvailable = true,
    ];
    setState(() {
      if (_selectedCategory.isEmpty) {
        _selectedCategory = 'Starters';
      }
    });
    _menu.setItems(mockItems);
  }

  // ────────────────── Ad lifecycle ──────────────────

  void _bootAds() async {
    debugPrint('[BOOT] Starting sync sequence...');

    if (Platform.isAndroid) {
      final status = await Permission.manageExternalStorage.request();
      if (!status.isGranted) {
        await Permission.storage.request();
      }
    }

    final cachedPlaylist = await _adSync.boot();
    if (cachedPlaylist.isNotEmpty && _isIdle) {
      _adPlayer.startLoop(cachedPlaylist);
    }
  }

  void _onPlaylistUpdated(List<String> newPlaylist, List<String> activeFileNames) {
    if (!mounted) return;

    if (_adPlayer.state.value.playlist.isEmpty && newPlaylist.isNotEmpty) {
      if (_isIdle) {
        _adPlayer.startLoop(newPlaylist);
      }
    } else {
      _adPlayer.updatePlaylist(newPlaylist);
    }

    _adSync.setProtectedPaths(_adPlayer.activeFilePaths);
  }

  void _trackAdImpression(String adSource) async {
    String bookingId = 'unknown';
    if (adSource.startsWith('static__')) {
      final parts = adSource.split('__');
      if (parts.length >= 2) bookingId = parts[1];
    } else {
      final fileName = adSource.split('/').last.split('\\').last;
      if (fileName.startsWith('ad_')) {
        bookingId = fileName.replaceAll('ad_', '').split('.').first;
      }
    }

    try {
      final req = AdImpressionRequest()
        ..deviceId = widget.deviceId
        ..bookingId = bookingId
        ..durationSeconds = 15
        ..interactiveClicks = 0;

      await _deviceClient.trackAdImpression(req, options: _callOptions);
    } catch (e) {
      debugPrint('gRPC Track ad impression telemetry failed: $e');
    }
  }

  // ────────────────── Idle/Activity management ──────────────────

  void _resetIdleTimer() {
    _inactivityTimer?.cancel();
    if (!_isIdle) {
      _inactivityTimer = Timer(kInactivityTimeout, () {
        if (mounted) {
          _cart.clear();
          setState(() {
            _isIdle = true;
            _showCart = false;
          });
          _adPlayer.resume();
        }
      });
    }
  }

  void _cancelIdleTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = null;
  }

  void _enterMenuMode() {
    setState(() {
      _isIdle = false;
      _showCart = false;
    });
    _adPlayer.pause();
    _resetIdleTimer();
  }

  void _returnToAds() {
    _cart.clear();
    setState(() {
      _isIdle = true;
      _showCart = false;
    });
    _adSync.syncNow();
    _adPlayer.resume();
    _cancelIdleTimer();
  }

  // ────────────────── Order placement ──────────────────

  void _placeOrder() {
    final snapshot = _cart.value;
    if (snapshot.isEmpty) return;
    final menuItems = _menu.value.items;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => OrderCheckoutModal(
        orderClient: _orderClient,
        callOptions: _callOptions,
        deviceId: widget.deviceId,
        menuItems: menuItems,
        cart: snapshot.toMap(),
        totalAmountPaise: (snapshot.totalPrice(menuItems) * 100).toInt(),
        onOrderCompleted: () {
          _cart.clear();
          setState(() {
            _isIdle = true;
            _showCart = false;
          });
          _adPlayer.resume();
          _cancelIdleTimer();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Payment Completed! Order sent to kitchen."),
              backgroundColor: Colors.green,
            ),
          );
        },
      ),
    );
  }

  // ────────────────── Unlock/Reset ──────────────────

  void _promptUnlock() {
    final passwordController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Enter Exit Password"),
        content: TextField(
          controller: passwordController,
          obscureText: true,
          decoration: const InputDecoration(
            hintText: "Enter password to exit kiosk",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () {
              if (passwordController.text == widget.bypassPassword) {
                Navigator.pop(context);
                widget.onReset();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text("Kiosk mode unlocked successfully")),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Incorrect password")),
                );
              }
            },
            child: const Text("Unlock"),
          )
        ],
      ),
    ).then((_) => passwordController.dispose());
  }

  // ────────────────── Lifecycle ──────────────────

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _inactivityTimer?.cancel();
    _adPlayer.dispose();
    _adSync.dispose();
    _cart.dispose();
    _menu.dispose();
    _channel.shutdown();
    super.dispose();
  }

  // ────────────────── Build ──────────────────

  @override
  Widget build(BuildContext context) {
    if (_isIdle) {
      return Scaffold(
        body: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _enterMenuMode,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AdViewWidget(
                playerState: _adPlayer.state,
                deviceId: widget.deviceId,
                adCampaigns: _adSync.adCampaigns,
              ),
              Positioned(
                top: 40,
                right: 20,
                child: IconButton(
                  icon: const Icon(Icons.admin_panel_settings_outlined,
                      color: Colors.white24),
                  onPressed: _promptUnlock,
                  tooltip: "Exit Kiosk",
                ),
              ),
            ],
          ),
        ),
      );
    }

    final isPortrait =
        MediaQuery.of(context).orientation == Orientation.portrait;

    return Listener(
      onPointerDown: (_) => _resetIdleTimer(),
      child: Scaffold(
        backgroundColor: kScaffoldBg,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Dynamic Header
              _buildHeader(isPortrait),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Divider(color: kDividerColor, height: 1),
              ),
              // 2. Body Area
              Expanded(
                child: _showCart
                    ? Padding(
                        padding: const EdgeInsets.fromLTRB(40, 24, 40, 24),
                        child: OrderSummaryPanel(
                          cartNotifier: _cart,
                          menuItems: _menu.value.items,
                          showHeader: false,
                          onPlaceOrder: _placeOrder,
                          serverHost: widget.serverHost,
                        ),
                      )
                    : Stack(
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Sidebar Categories
                              _buildSidebar(),
                              // Vertical divider
                              Container(width: 1, color: kDividerColor),
                              // Grid Catalog Menu
                              Expanded(
                                child: MenuCatalogWidget(
                                  menuNotifier: _menu,
                                  cartNotifier: _cart,
                                  serverHost: widget.serverHost,
                                  viewportHeight: MediaQuery.of(context).size.height,
                                  selectedCategory: _selectedCategory,
                                ),
                              ),
                            ],
                          ),
                          // Floating Bottom Cart Bar
                          _buildFloatingCartBar(),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isPortrait) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
      child: Row(
        children: [
          // Back Button (only shown on the Cart page)
          if (_showCart) ...[
            GestureDetector(
              onTap: () {
                setState(() {
                  _showCart = false;
                });
              },
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 6,
                      offset: Offset(0, 3),
                    )
                  ],
                ),
                padding: const EdgeInsets.all(12),
                child: const Icon(Icons.arrow_back, color: kTextDark, size: 20),
              ),
            ),
            const SizedBox(width: 20),
          ],
          // Title / Outlet name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _showCart
                    ? Text(
                        _outletName.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: kAccentBlue,
                          letterSpacing: 1.5,
                        ),
                      )
                    : Text(
                        _outletName,
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: kTextDark,
                          letterSpacing: 0.5,
                        ),
                      ),
                if (_showCart) ...[
                  const SizedBox(height: 2),
                  const Text(
                    "Your Cart",
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: kTextDark,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Play button (Return to Ads slideshow)
          IconButton(
            icon: const Icon(Icons.play_circle_outline_rounded, color: kTextGrey),
            onPressed: _returnToAds,
            tooltip: "Return to ad slideshow",
          ),
          const SizedBox(width: 8),
          // Settings/Unlock button
          IconButton(
            icon: const Icon(Icons.admin_panel_settings_outlined, color: kTextGrey),
            onPressed: _promptUnlock,
            tooltip: "Exit Kiosk Mode",
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    final categoriesOrder = ['Starters', 'Main Course', 'Dessert', 'Beverages'];
    final categories = <String>[];
    for (final cat in categoriesOrder) {
      if (_menu.value.items.any((item) => item.category.toLowerCase() == cat.toLowerCase())) {
        categories.add(cat);
      }
    }
    for (final item in _menu.value.items) {
      if (!categoriesOrder.any((cat) => cat.toLowerCase() == item.category.toLowerCase()) &&
          !categories.contains(item.category)) {
        categories.add(item.category);
      }
    }
    if (categories.isEmpty) {
      categories.addAll(categoriesOrder);
    }

    return Container(
      width: 120,
      color: kSidebarBg,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 8),
      child: Column(
        children: [
          Expanded(
            child: ListView.separated(
              itemCount: categories.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final cat = categories[index];
                final isSelected = cat.toLowerCase() == _selectedCategory.toLowerCase();

                IconData iconData;
                switch (cat.toLowerCase()) {
                  case 'starters':
                    iconData = Icons.local_florist_outlined;
                    break;
                  case 'main course':
                    iconData = Icons.dinner_dining_outlined;
                    break;
                  case 'dessert':
                  case 'desserts':
                    iconData = Icons.icecream_outlined;
                    break;
                  case 'beverages':
                  case 'drinks':
                    iconData = Icons.local_bar_outlined;
                    break;
                  default:
                    iconData = Icons.restaurant_menu_rounded;
                }

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedCategory = cat;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? kAccentBlue : kCardBg,
                      borderRadius: kCardBorderRadius,
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        )
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          iconData,
                          color: isSelected ? Colors.white : kTextDark,
                          size: 26,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          cat,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : kTextDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingCartBar() {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: _cart,
      builder: (context, cart, _) {
        if (cart.isEmpty) return const SizedBox.shrink();
        return Positioned(
          bottom: 24,
          left: 144,
          right: 24,
          child: Container(
            height: 72,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: kFloatingCartBorderRadius,
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 10,
                  offset: Offset(0, 4),
                )
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      decoration: const BoxDecoration(
                        color: kAccentBlue,
                        shape: BoxShape.circle,
                      ),
                      padding: const EdgeInsets.all(10),
                      child: Badge(
                        isLabelVisible: cart.isNotEmpty,
                        label: Text('${cart.totalItemCount}', style: const TextStyle(color: Colors.white)),
                        child: const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 20),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "${cart.totalItemCount} items in cart",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextDark),
                        ),
                        Text(
                          "Total value: Rs. ${cart.totalPrice(_menu.value.items).toStringAsFixed(2)}",
                          style: const TextStyle(fontSize: 12, color: kTextGrey),
                        ),
                      ],
                    ),
                  ],
                ),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _showCart = true;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kAccentBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    elevation: 2,
                  ),
                  child: const Row(
                    children: [
                      Text("View Cart", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
