import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:grpc/grpc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:video_player/video_player.dart';
import 'package:fixnum/fixnum.dart';

import 'generated/device.pbgrpc.dart';
import 'generated/menu.pbgrpc.dart';
import 'generated/order.pbgrpc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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

class TabletopOrderingApp extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tabletop Ordering Kiosk',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.blue,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        cardTheme: const CardThemeData(
          color: Color(0xFF1E293B),
        ),
      ),
      home: MainDeviceRouter(
        initialActivated: initialActivated,
        initialServerHost: initialServerHost,
        initialDeviceId: initialDeviceId,
        initialToken: initialToken,
        initialHostApplicationId: initialHostApplicationId,
        initialBypassPassword: initialBypassPassword,
      ),
    );
  }
}

class MainDeviceRouter extends StatefulWidget {
  final bool initialActivated;
  final String initialServerHost;
  final String initialDeviceId;
  final String initialToken;
  final String initialHostApplicationId;
  final String initialBypassPassword;

  const MainDeviceRouter({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
    required this.initialBypassPassword,
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

  void _onActivate(String serverHost, String deviceId, String token, String hostApplicationId, String password) {
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
      return DeviceSetupScreen(onActivate: _onActivate);
    }
    return KioskScreen(
      serverHost: _serverHost,
      deviceId: _deviceId,
      token: _token,
      hostApplicationId: _hostApplicationId,
      bypassPassword: _bypassPassword,
      onReset: _onReset,
    );
  }
}

class DeviceSetupScreen extends StatefulWidget {
  final Function(String, String, String, String, String) onActivate;
  const DeviceSetupScreen({super.key, required this.onActivate});

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

  void _submit() async {
    setState(() {
      _error = '';
      _loading = true;
    });

    final serverHost = _serverHostController.text.trim();
    final deviceId = _deviceIdController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (serverHost.isEmpty || deviceId.isEmpty || password.isEmpty || confirmPassword.isEmpty) {
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
        hardwareId = 'hw_tab_${DateTime.now().millisecondsSinceEpoch}_$deviceId';
        await prefs.setString('hardware_id', hardwareId);
      }

      final url = Uri.parse('http://$serverHost:4200/api/v1/auth/device/activate');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceId': deviceId,
          'hardwareId': hardwareId,
          'deviceType': 'tablet',
          'kioskPassword': password,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['data']['token'];
        final hostApplicationId = data['data']['hostApplicationId'];

        await prefs.setString('serverHost', serverHost);
        await prefs.setString('deviceId', deviceId);
        await prefs.setString('token', token);
        await prefs.setString('hostApplicationId', hostApplicationId);
        await prefs.setString('bypassPassword', password);

        widget.onActivate(serverHost, deviceId, token, hostApplicationId, password);
      } else {
        setState(() {
          _error = data['message'] ?? 'Activation failed';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Connection failed: Ensure server is running and IP is correct';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              width: 450,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.settings_suggest, size: 64, color: Colors.blueAccent),
                  const SizedBox(height: 16),
                  const Text(
                    "Kiosk Tablet Setup",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "One-time authorization setup for tabletop display device.",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 24),
                  if (_error.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
                      ),
                      child: Text(
                        _error,
                        style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _serverHostController,
                    decoration: InputDecoration(
                      labelText: "Server Host / IP",
                      helperText: "e.g. 10.0.2.2 (Emulator) or 192.168.1.X (Local Wifi)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.dns),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _deviceIdController,
                    decoration: InputDecoration(
                      labelText: "Device ID (e.g. DEV_TAB_XXXX)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.tablet_mac),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: "Set Bypass Password",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: "Confirm Bypass Password",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lock),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _loading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text("Authorize & Bind Device", style: TextStyle(fontWeight: FontWeight.bold)),
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

class KioskScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final VoidCallback onReset;

  const KioskScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.onReset,
  });

  @override
  State<KioskScreen> createState() => _KioskScreenState();
}

class _KioskScreenState extends State<KioskScreen> {
  bool _isIdle = true;
  late ClientChannel _channel;
  late DeviceServiceClient _deviceClient;
  late MenuServiceClient _menuClient;
  late OrderServiceClient _orderClient;
  late CallOptions _callOptions;
  Timer? _heartbeatTimer;

  // Menu and Cart states
  List<MenuItem> _menuItems = [];
  final Map<String, int> _cart = {}; // itemId -> quantity
  bool _menuLoading = false;
  String _menuError = '';

  // Ads state
  List<Map<String, dynamic>> _adCampaigns = [];
  int _currentAdIndex = 0;
  Timer? _adRotateTimer;
  VideoPlayerController? _videoPlayerController;
  bool _adLoading = false;

  @override
  void initState() {
    super.initState();
    _initGrpc();
    _registerAndStartHeartbeat();
    _fetchMenu();
    _fetchAds();
  }

  void _initGrpc() {
    _channel = ClientChannel(
      widget.serverHost,
      port: 50051,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );

    _deviceClient = DeviceServiceClient(_channel);
    _menuClient = MenuServiceClient(_channel);
    _orderClient = OrderServiceClient(_channel);

    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: const Duration(seconds: 10),
    );
  }

  void _registerAndStartHeartbeat() async {
    try {
      final req = RegisterDeviceRequest()
        ..deviceId = widget.deviceId
        ..deviceType = 'tablet'
        ..hostApplicationId = widget.hostApplicationId;

      await _deviceClient.registerDevice(req, options: _callOptions);
      print('gRPC Device registered successfully');
    } catch (e) {
      print('gRPC Device registration failed: $e');
    }

    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      try {
        await _deviceClient.sendHeartbeat(HeartbeatRequest()..deviceId = widget.deviceId, options: _callOptions);
      } catch (e) {
        print('gRPC Heartbeat failed: $e');
      }
    });
  }

  void _fetchMenu() async {
    if (mounted) {
      setState(() {
        _menuLoading = true;
        _menuError = '';
      });
    }

    try {
      final req = GetMenuRequest()
        ..deviceId = widget.deviceId
        ..merchantId = ''; // resolved from token by backend

      final response = await _menuClient.getMenu(req, options: _callOptions);

      if (mounted) {
        setState(() {
          _menuItems = response.items;
          _menuLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _menuError = 'Failed to load menu. Showing local backup catalog.';
          _menuLoading = false;
          _loadMockFallbackMenu();
        });
      }
    }
  }

  void _loadMockFallbackMenu() {
    // Standard mock fallback menu if gRPC call fails or is empty
    _menuItems = [
      MenuItem()
        ..itemId = 'item_fallback_1'
        ..name = 'Pepperoni Pizza Grande'
        ..description = 'Extra cheese, fresh basil on a wood-fired crust'
        ..price = Int64(44900) // 449.00 INR
        ..category = 'Main Course'
        ..isAvailable = true,
      MenuItem()
        ..itemId = 'item_fallback_2'
        ..name = 'Crispy French Fries'
        ..description = 'With parmesan & garlic rosemary mayo dip'
        ..price = Int64(22900) // 229.00 INR
        ..category = 'Starters'
        ..isAvailable = true,
      MenuItem()
        ..itemId = 'item_fallback_3'
        ..name = 'Cheeseburger Deluxe'
        ..description = 'Flame grilled double beef patty, brioche bun'
        ..price = Int64(29900) // 299.00 INR
        ..category = 'Main Course'
        ..isAvailable = true,
      MenuItem()
        ..itemId = 'item_fallback_4'
        ..name = 'Iced Hazelnut Latte'
        ..description = 'Double fresh espresso shot, cold micro foam'
        ..price = Int64(17900) // 179.00 INR
        ..category = 'Beverages'
        ..isAvailable = true,
    ];
  }

  void _fetchAds() async {
    if (mounted) {
      setState(() => _adLoading = true);
    }

    try {
      final url = Uri.parse('http://${widget.serverHost}:4200/api/v1/auth/device/ads');
      final response = await http.get(
        url,
        headers: {'Authorization': 'Bearer ${widget.token}'},
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final List list = data['data'] ?? [];
        if (mounted) {
          setState(() {
            _adCampaigns = list.map((item) => Map<String, dynamic>.from(item)).toList();
            _adLoading = false;
          });
          _startAdLoop();
        }
      } else {
        if (mounted) setState(() => _adLoading = false);
        _loadFallbackAds();
      }
    } catch (e) {
      if (mounted) setState(() => _adLoading = false);
      _loadFallbackAds();
    }
  }

  void _loadFallbackAds() {
    _adCampaigns = [
      {
        'bookingId': 'B_FALLBACK_1',
        'mediaUrl': '',
        'title': 'Aibot Ink Solutions',
        'subtitle': 'Digitize your outlet with our premium tablet menus.'
      },
      {
        'bookingId': 'B_FALLBACK_2',
        'mediaUrl': '',
        'title': 'FitLife Gym Indiranagar - 30% Off',
        'subtitle': 'Scan to claim discount voucher.'
      }
    ];
    _startAdLoop();
  }

  void _startAdLoop() {
    if (_adCampaigns.isEmpty) return;
    _currentAdIndex = 0;
    _setupCurrentAdPlayback();
  }

  void _setupCurrentAdPlayback() {
    _adRotateTimer?.cancel();
    _videoPlayerController?.dispose();
    _videoPlayerController = null;

    if (_adCampaigns.isEmpty) return;
    final ad = _adCampaigns[_currentAdIndex];
    final mediaUrl = ad['mediaUrl'] as String? ?? '';

    // Log Ad telemetry impression via gRPC
    _trackAdImpression(ad['bookingId'] ?? 'unknown');

    if (mediaUrl.isNotEmpty && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'))) {
      final absoluteMediaUrl = mediaUrl.startsWith('http') 
          ? mediaUrl 
          : 'http://${widget.serverHost}:4200$mediaUrl';

      _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(absoluteMediaUrl))
        ..initialize().then((_) {
          if (mounted) {
            setState(() {});
            _videoPlayerController!.play();
            _videoPlayerController!.setLooping(false);
          }
        }).catchError((err) {
          print('Video Player Init Error: $err');
        });

      // Listen for video completion to go to next ad
      _videoPlayerController!.addListener(() {
        if (_videoPlayerController != null &&
            _videoPlayerController!.value.position >= _videoPlayerController!.value.duration) {
          _nextAd();
        }
      });

      // Safety timeout in case video loading hangs
      _adRotateTimer = Timer(const Duration(seconds: 18), _nextAd);
    } else {
      // Static Ad: Rotate after 8 seconds
      _adRotateTimer = Timer(const Duration(seconds: 8), _nextAd);
    }
  }

  void _trackAdImpression(String bookingId) async {
    try {
      final req = AdImpressionRequest()
        ..deviceId = widget.deviceId
        ..bookingId = bookingId
        ..durationSeconds = 15
        ..interactiveClicks = 0;

      await _deviceClient.trackAdImpression(req, options: _callOptions);
    } catch (e) {
      print('gRPC Track ad impression telemetry failed: $e');
    }
  }

  void _nextAd() {
    if (_adCampaigns.isEmpty) return;
    if (mounted) {
      setState(() {
        _currentAdIndex = (_currentAdIndex + 1) % _adCampaigns.length;
      });
      _setupCurrentAdPlayback();
    }
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _adRotateTimer?.cancel();
    _videoPlayerController?.dispose();
    _channel.shutdown();
    super.dispose();
  }

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
                Navigator.pop(context); // close dialog
                widget.onReset(); // deactivate device/go back to setup
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Kiosk mode unlocked successfully")),
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
    );
  }

  double _getCartTotal() {
    double total = 0;
    _cart.forEach((itemId, quantity) {
      final item = _menuItems.firstWhere((i) => i.itemId == itemId);
      total += (item.price.toDouble() / 100.0) * quantity;
    });
    return total;
  }

  void _placeOrder() {
    if (_cart.isEmpty) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => OrderCheckoutModal(
        orderClient: _orderClient,
        callOptions: _callOptions,
        deviceId: widget.deviceId,
        menuItems: _menuItems,
        cart: _cart,
        totalAmountPaise: (_getCartTotal() * 100).toInt(),
        onOrderCompleted: () {
          setState(() {
            _cart.clear();
            _isIdle = true;
          });
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

  @override
  Widget build(BuildContext context) {
    if (_isIdle) {
      return Scaffold(
        body: GestureDetector(
          onTap: () {
            setState(() {
              _isIdle = false;
            });
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Ad Display
              if (_adCampaigns.isNotEmpty) _buildAdView(),
              
              // Touch layout message
              const Positioned(
                bottom: 40,
                left: 0,
                right: 0,
                child: Text(
                  "TOUCH SCREEN TO VIEW FOOD MENU",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 2.0,
                    shadows: [
                      Shadow(color: Colors.black, blurRadius: 10, offset: Offset(2, 2)),
                    ],
                  ),
                ),
              ),
              // Hidden Admin Unlock Button (Top Right)
              Positioned(
                top: 40,
                right: 20,
                child: IconButton(
                  icon: const Icon(Icons.lock_open, color: Colors.white10),
                  onPressed: _promptUnlock,
                  tooltip: "Exit Kiosk",
                ),
              )
            ],
          ),
        ),
      );
    }

    // Category lists helper
    final Map<String, List<MenuItem>> categorizedItems = {
      'Starters': [],
      'Main Course': [],
      'Dessert': [],
      'Beverages': [],
    };

    for (var item in _menuItems) {
      if (categorizedItems.containsKey(item.category)) {
        categorizedItems[item.category]!.add(item);
      } else {
        categorizedItems.putIfAbsent(item.category, () => []).add(item);
      }
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Text("Outlet Kiosk: ${widget.deviceId} — Table 05"),
        actions: [
          IconButton(
            icon: const Icon(Icons.lock_open),
            onPressed: _promptUnlock,
            tooltip: "Exit Kiosk Mode",
          ),
          IconButton(
            icon: const Icon(Icons.slideshow),
            onPressed: () {
              setState(() {
                _isIdle = true;
                _cart.clear();
              });
            },
            tooltip: "Return to ad slideshow",
          )
        ],
      ),
      body: Row(
        children: [
          // Dynamic Menu catalog
          Expanded(
            flex: 2,
            child: _menuLoading
                ? const Center(child: CircularProgressIndicator())
                : _menuItems.isEmpty
                    ? const Center(child: Text("No menu items available."))
                    : ListView(
                        padding: const EdgeInsets.all(24),
                        children: categorizedItems.keys.map((category) {
                          final items = categorizedItems[category]!;
                          if (items.isEmpty) return const SizedBox.shrink();

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12.0),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 20,
                                      color: Colors.blueAccent,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      category.toUpperCase(),
                                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                                    ),
                                  ],
                                ),
                              ),
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 16,
                                  mainAxisSpacing: 16,
                                  childAspectRatio: 1.5,
                                ),
                                itemCount: items.length,
                                itemBuilder: (context, index) {
                                  final item = items[index];
                                  final absoluteImageUrl = item.imageUrl.isNotEmpty 
                                      ? (item.imageUrl.startsWith('http') 
                                          ? item.imageUrl 
                                          : 'http://${widget.serverHost}:4200${item.imageUrl}')
                                      : '';

                                  return Card(
                                    clipBehavior: Clip.antiAlias,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    child: Row(
                                      children: [
                                        // Menu Image
                                        Container(
                                          width: 110,
                                          height: double.infinity,
                                          color: Colors.black26,
                                          child: absoluteImageUrl.isNotEmpty
                                              ? Image.network(
                                                  absoluteImageUrl,
                                                  fit: BoxFit.cover,
                                                  errorBuilder: (context, error, stackTrace) => const Icon(Icons.restaurant, size: 40, color: Colors.white24),
                                                )
                                              : const Icon(Icons.restaurant, size: 40, color: Colors.white24),
                                        ),
                                        Expanded(
                                          child: Padding(
                                            padding: const EdgeInsets.all(12.0),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      item.name,
                                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Text(
                                                      item.description,
                                                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                                      maxLines: 2,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ],
                                                ),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Text(
                                                      "₹${(item.price.toDouble() / 100.0).toStringAsFixed(1)}",
                                                      style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.blueAccent, fontSize: 16),
                                                    ),
                                                    ElevatedButton(
                                                      onPressed: item.isAvailable
                                                          ? () {
                                                              setState(() {
                                                                _cart[item.itemId] = (_cart[item.itemId] ?? 0) + 1;
                                                              });
                                                            }
                                                          : null,
                                                      style: ElevatedButton.styleFrom(
                                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                        minimumSize: Size.zero,
                                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                      ),
                                                      child: Text(item.isAvailable ? "ADD" : "OUT"),
                                                    ),
                                                  ],
                                                )
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 24),
                            ],
                          );
                        }).toList(),
                      ),
          ),
          
          // Order Summary Panel (Sidebar)
          Container(
            width: 320,
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(left: BorderSide(color: Colors.white10)),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Order Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                const SizedBox(height: 20),
                Expanded(
                  child: _cart.isEmpty
                      ? const Center(child: Text("Cart is empty", style: TextStyle(color: Color(0xFF64748B))))
                      : ListView.builder(
                          itemCount: _cart.length,
                          itemBuilder: (context, index) {
                            final itemId = _cart.keys.elementAt(index);
                            final quantity = _cart[itemId]!;
                            final item = _menuItems.firstWhere((i) => i.itemId == itemId);

                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(item.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                              subtitle: Text("₹${(item.price.toDouble() / 100.0).toStringAsFixed(1)} x $quantity", style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline, color: Colors.blueAccent, size: 20),
                                    onPressed: () {
                                      setState(() {
                                        if (quantity > 1) {
                                          _cart[itemId] = quantity - 1;
                                        } else {
                                          _cart.remove(itemId);
                                        }
                                      });
                                    },
                                  ),
                                  Text("$quantity", style: const TextStyle(fontWeight: FontWeight.bold)),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline, color: Colors.blueAccent, size: 20),
                                    onPressed: () {
                                      setState(() {
                                        _cart[itemId] = quantity + 1;
                                      });
                                    },
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                if (_cart.isNotEmpty) ...[
                  const Divider(),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12.0),
                    key: const ValueKey('checkout_summary'),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Total:", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text("₹${_getCartTotal().toStringAsFixed(2)}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.blueAccent)),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: _placeOrder,
                    icon: const Icon(Icons.payment),
                    label: const Text("Confirm & Place Order", style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  )
                ]
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildAdView() {
    final ad = _adCampaigns[_currentAdIndex];
    final mediaUrl = ad['mediaUrl'] as String? ?? '';
    final title = ad['title'] as String? ?? '';
    final subtitle = ad['subtitle'] as String? ?? ad['description'] ?? '';

    final hasVideo = mediaUrl.isNotEmpty && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'));
    final isVideoInitialized = _videoPlayerController != null && _videoPlayerController!.value.isInitialized;

    return Container(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Play Video
          if (hasVideo && isVideoInitialized)
            FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: _videoPlayerController!.value.size.width,
                height: _videoPlayerController!.value.size.height,
                child: VideoPlayer(_videoPlayerController!),
              ),
            )
          else
            // Fallback UI or Static Graphic
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.play_circle_fill, size: 80, color: Colors.blueAccent),
                    const SizedBox(height: 20),
                    Text(
                      "DEVICE IN SESSION: ${widget.deviceId}",
                      style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      "SPONSORED ADVERTISEMENT",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.blue),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      title,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            
          // QR overlay on the bottom right for active campaigns (if valid URL or index)
          Positioned(
            bottom: 30,
            right: 30,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 4)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: QrImageView(
                      data: mediaUrl.isNotEmpty ? mediaUrl : 'http://${widget.serverHost}:4200/ad/${ad['bookingId']}',
                      version: QrVersions.auto,
                      size: 100,
                      gapless: false,
                      foregroundColor: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Scan to Claim Offer",
                    style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}

class OrderCheckoutModal extends StatefulWidget {
  final OrderServiceClient orderClient;
  final CallOptions callOptions;
  final String deviceId;
  final List<MenuItem> menuItems;
  final Map<String, int> cart;
  final int totalAmountPaise;
  final VoidCallback onOrderCompleted;

  const OrderCheckoutModal({
    super.key,
    required this.orderClient,
    required this.callOptions,
    required this.deviceId,
    required this.menuItems,
    required this.cart,
    required this.totalAmountPaise,
    required this.onOrderCompleted,
  });

  @override
  State<OrderCheckoutModal> createState() => _OrderCheckoutModalState();
}

class _OrderCheckoutModalState extends State<OrderCheckoutModal> {
  bool _loading = true;
  String _error = '';
  String _orderId = '';
  String _paymentUrl = '';
  Timer? _statusPollTimer;

  @override
  void initState() {
    super.initState();
    _createOrder();
  }

  void _createOrder() async {
    try {
      final orderItems = widget.cart.entries.map((entry) {
        final item = widget.menuItems.firstWhere((i) => i.itemId == entry.key);
        return OrderItem()
          ..itemId = item.itemId
          ..name = item.name
          ..quantity = entry.value
          ..price = item.price; // price in paise
      }).toList();

      final req = CreateOrderRequest()
        ..deviceId = widget.deviceId
        ..merchantId = ''
        ..tableNumber = 'Table 5'
        ..items.addAll(orderItems)
        ..totalAmount = Int64(widget.totalAmountPaise);

      final response = await widget.orderClient.createOrder(req, options: widget.callOptions);

      if (response.success) {
        if (mounted) {
          setState(() {
            _orderId = response.orderId;
            _paymentUrl = response.paymentUrl;
            _loading = false;
          });
        }
        _startPolling(responseOrderId: response.orderId);
      } else {
        if (mounted) {
          setState(() {
            _error = response.message;
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to process order via server: $e';
          _loading = false;
        });
      }
    }
  }

  void _startPolling({required String responseOrderId}) {
    _statusPollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      try {
        final checkReq = GetOrderStatusRequest()..orderId = responseOrderId;
        final response = await widget.orderClient.getOrderStatus(checkReq, options: widget.callOptions);

        if (response.paymentStatus == 'completed') {
          _statusPollTimer?.cancel();
          Navigator.pop(context); // close modal
          widget.onOrderCompleted();
        } else if (response.paymentStatus == 'failed') {
          _statusPollTimer?.cancel();
          if (mounted) {
            setState(() {
              _error = 'Payment transaction failed. Please retry.';
            });
          }
        }
      } catch (e) {
        print('Polling order status error: $e');
      }
    });
  }

  @override
  void dispose() {
    _statusPollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Complete Checkout", style: TextStyle(fontWeight: FontWeight.bold)),
      content: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_loading) ...[
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              const Text("Initializing payment URL..."),
            ] else if (_error.isNotEmpty) ...[
              const Icon(Icons.error_outline, color: Colors.red, size: 50),
              const SizedBox(height: 16),
              Text(_error, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
            ] else ...[
              const Icon(Icons.qr_code_scanner, color: Colors.blueAccent, size: 50),
              const SizedBox(height: 16),
              const Text(
                "Scan PhonePe QR to Pay",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                "Order ID: $_orderId",
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                color: Colors.white,
                child: QrImageView(
                  data: _paymentUrl,
                  version: QrVersions.auto,
                  size: 200,
                  foregroundColor: Colors.black,
                ),
              ),
              const SizedBox(height: 16),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text("Waiting for payment callback...", style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                ],
              )
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            _statusPollTimer?.cancel();
            Navigator.pop(context);
          },
          child: const Text("Cancel"),
        ),
      ],
    );
  }
}
