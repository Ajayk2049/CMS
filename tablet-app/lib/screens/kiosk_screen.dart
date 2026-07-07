import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grpc/grpc.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:fixnum/fixnum.dart';

import '../generated/device.pbgrpc.dart';
import '../generated/menu.pbgrpc.dart';
import '../generated/order.pbgrpc.dart';

import '../constants.dart';
import '../menu_state.dart';
import '../ad_player_service.dart';
import '../ad_sync_service.dart';
import '../widgets/ad_view.dart';
import '../widgets/menu_catalog.dart';
import '../widgets/order_summary.dart';
import '../widgets/checkout_modal.dart';

// ═══════════════════════════════════════════════════════════════════
//  KIOSK SCREEN — Main kiosk orchestrator (ANR-safe startup)
// ═══════════════════════════════════════════════════════════════════

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
  // ── Broad state ──
  bool _isIdle = true;
  bool _showCart = false;
  bool _kioskReady = false;
  bool _isOnline = true;
  String _outletName = 'Aster & Ice';
  String _selectedCategory = '';

  // ── gRPC ──
  ClientChannel? _channel;
  DeviceServiceClient? _deviceClient;
  MenuServiceClient? _menuClient;
  OrderServiceClient? _orderClient;
  CallOptions? _callOptions;
  Timer? _heartbeatTimer;
  int _heartbeatFailCount = 0;
  static const int _maxHeartbeatFailsBeforeOffline = 2;

  // ── Decoupled services ──
  late final AdPlayerService _adPlayer;
  late final AdSyncService _adSync;
  final CartNotifier _cart = CartNotifier();
  final MenuNotifier _menu = MenuNotifier();

  // ── Timers ──
  Timer? _inactivityTimer;

  // ── Controllers ──
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    _adPlayer = AdPlayerService(onImpression: _trackAdImpression);
    _adSync = AdSyncService(
      serverHost: widget.serverHost,
      token: widget.token,
      adsDirectory: kAdsDirectoryPath,
      onPlaylistUpdated: _onPlaylistUpdated,
    );

    // ═══ CRITICAL ANR FIX ═══
    WidgetsBinding.instance.addPostFrameCallback((_) => _deferredBootstrap());
  }

  // ────────────────── Deferred bootstrap ──────────────────

  Future<void> _deferredBootstrap() async {
    _initGrpc();
    await _registerAndStartHeartbeat();
    await _fetchMenu();
    await _bootAds();

    if (mounted) {
      setState(() {
        _kioskReady = true;
      });
    }
  }

  void _initGrpc() {
    _channel = ClientChannel(
      widget.serverHost,
      port: 4201,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );
    _deviceClient = DeviceServiceClient(_channel!);
    _menuClient = MenuServiceClient(_channel!);
    _orderClient = OrderServiceClient(_channel!);
    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: kHttpTimeout,
    );
  }

  Future<void> _registerAndStartHeartbeat() async {
    try {
      final req = RegisterDeviceRequest()
        ..deviceId = widget.deviceId
        ..deviceType = 'tablet'
        ..hostApplicationId = widget.hostApplicationId;
      await _deviceClient!.registerDevice(req, options: _callOptions);
      debugPrint('gRPC Device registered successfully');
      _markOnline();
    } catch (e) {
      debugPrint('gRPC Device registration failed: $e');
      _markOffline();
    }

    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(kHeartbeatInterval, (timer) async {
      try {
        await _deviceClient!.sendHeartbeat(
            HeartbeatRequest()..deviceId = widget.deviceId,
            options: _callOptions);
        if (_heartbeatFailCount > 0) _heartbeatFailCount = 0;
        if (!_isOnline) _markOnline();
      } catch (e) {
        _heartbeatFailCount++;
        debugPrint('gRPC Heartbeat failed ($_heartbeatFailCount): $e');
        if (_heartbeatFailCount >= _maxHeartbeatFailsBeforeOffline) {
          _markOffline();
        }
      }
    });
  }

  void _markOnline() {
    if (!_isOnline && mounted) {
      setState(() => _isOnline = true);
      _showBackOnlinePopup();
    }
  }

  void _markOffline() {
    if (_isOnline && mounted) {
      setState(() => _isOnline = false);
    }
  }

  void _showBackOnlinePopup() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        backgroundColor: kCardBg,
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Row(
          children: [
            Icon(Icons.cloud_done_rounded, color: Colors.green, size: 28),
            SizedBox(width: 12),
            Text('Back Online!',
                style: TextStyle(fontWeight: FontWeight.bold, color: kTextDark)),
          ],
        ),
        content: const Text(
          'Connection restored. Ordering and menu are now fully available.',
          style: TextStyle(color: kTextGrey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Got it',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _fetchMenu() async {
    _menu.setLoading();
    try {
      final req = GetMenuRequest()
        ..deviceId = widget.deviceId
        ..merchantId = '';
      final response = await _menuClient!.getMenu(req, options: _callOptions);
      if (mounted) {
        setState(() {
          _outletName =
              response.message.isNotEmpty ? response.message : 'Aster & Ice';
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
      if (_selectedCategory.isEmpty) _selectedCategory = 'Starters';
    });
    _menu.setItems(mockItems);
  }

  // ────────────────── Ad lifecycle ──────────────────

  Future<void> _bootAds() async {
    debugPrint('[BOOT] Starting sync sequence...');

    if (Platform.isAndroid) {
      final isGranted = await Permission.manageExternalStorage.isGranted;
      if (!isGranted) {
        final status = await Permission.manageExternalStorage.request();
        if (!status.isGranted) {
          await Permission.storage.request();
        }
      }
    }

    final cachedPlaylist = await _adSync.boot();
    if (cachedPlaylist.isNotEmpty && _isIdle) {
      _adPlayer.startLoop(cachedPlaylist);
    }
  }

  void _onPlaylistUpdated(
      List<String> newPlaylist, List<String> activeFileNames) {
    if (!mounted) return;
    if (_adPlayer.state.value.playlist.isEmpty && newPlaylist.isNotEmpty) {
      if (_isIdle) _adPlayer.startLoop(newPlaylist);
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
      await _deviceClient!.trackAdImpression(req, options: _callOptions);
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
    if (!_isOnline) return;
    final snapshot = _cart.value;
    if (snapshot.isEmpty) return;
    final menuItems = _menu.value.items;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => OrderCheckoutModal(
        orderClient: _orderClient!,
        callOptions: _callOptions!,
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
    _passwordController.clear();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Enter Exit Password"),
        content: TextField(
          controller: _passwordController,
          obscureText: true,
          decoration: const InputDecoration(hintText: "Enter password to exit kiosk"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () {
              if (_passwordController.text == widget.bypassPassword) {
                Navigator.pop(context);
                widget.onReset();
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

  // ────────────────── Lifecycle ──────────────────

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _inactivityTimer?.cancel();
    _passwordController.dispose();
    _adPlayer.dispose();
    _adSync.dispose();
    _cart.dispose();
    _menu.dispose();
    _channel?.shutdown();
    super.dispose();
  }

  // ────────────────── Build ──────────────────

  @override
  Widget build(BuildContext context) {
    if (!_kioskReady) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/SplashScreen.png',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
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

    return Listener(
      onPointerDown: (_) => _resetIdleTimer(),
      child: Scaffold(
        backgroundColor: kScaffoldBg,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!_isOnline) _buildOfflineBanner(),
              _buildHeader(),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Divider(color: kDividerColor, height: 1),
              ),
              Expanded(
                child: _showCart ? _buildCartBody() : _buildMenuBody(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOfflineBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      color: Colors.orange.shade800,
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off_rounded, color: Colors.white, size: 16),
          SizedBox(width: 8),
          Text(
            'Server Offline — Browsing only',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartBody() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(40, 24, 40, 24),
      child: Column(
        children: [
          Expanded(
            child: OrderSummaryPanel(
              cartNotifier: _cart,
              menuItems: _menu.value.items,
              showHeader: false,
              onPlaceOrder: _isOnline ? _placeOrder : () {},
              serverHost: widget.serverHost,
            ),
          ),
          if (!_isOnline)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(32),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.cloud_off_rounded, color: Colors.white54, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Checkout Unavailable — Connecting…',
                    style: TextStyle(
                      color: Colors.white54,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMenuBody() {
    return Stack(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildSidebar(),
            Container(width: 1, color: kDividerColor),
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
        _buildFloatingCartBar(),
        if (!_isOnline)
          Positioned.fill(
            child: AbsorbPointer(
              child: Container(
                color: Colors.black.withValues(alpha: 0.08),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
      child: Row(
        children: [
          if (_showCart) ...[
            GestureDetector(
              onTap: () => setState(() => _showCart = false),
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
          IconButton(
            icon: const Icon(Icons.play_circle_outline_rounded, color: kTextGrey),
            onPressed: _returnToAds,
            tooltip: "Return to ad slideshow",
          ),
          const SizedBox(width: 8),
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
    const categoriesOrder = ['Starters', 'Main Course', 'Dessert', 'Beverages'];
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
    if (categories.isEmpty) categories.addAll(categoriesOrder);

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
                  onTap: () => setState(() => _selectedCategory = cat),
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
                        Icon(iconData, color: isSelected ? Colors.white : kTextDark, size: 26),
                        const SizedBox(height: 8),
                        Text(cat,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : kTextDark)),
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
                BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      decoration: const BoxDecoration(color: kAccentBlue, shape: BoxShape.circle),
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
                        Text("${cart.totalItemCount} items in cart",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextDark)),
                        Text("Total value: Rs. ${cart.totalPrice(_menu.value.items).toStringAsFixed(2)}",
                            style: const TextStyle(fontSize: 12, color: kTextGrey)),
                      ],
                    ),
                  ],
                ),
                if (_isOnline)
                  ElevatedButton(
                    onPressed: () => setState(() => _showCart = true),
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
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.cloud_off_rounded, size: 16, color: Colors.grey),
                        SizedBox(width: 6),
                        Text('Offline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
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
