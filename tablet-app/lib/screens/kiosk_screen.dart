import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grpc/grpc.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:fixnum/fixnum.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
import '../widgets/payment_qr_widget.dart';
import '../widgets/download_progress_indicator.dart';
import '../menu_image_cache.dart';
import 'settings_screen.dart';

// ═══════════════════════════════════════════════════════════════════
//  KIOSK SCREEN — Main kiosk orchestrator (ANR-safe startup)
// ═══════════════════════════════════════════════════════════════════

class KioskScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final String tableNumber;
  final VoidCallback onReset;

  const KioskScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.tableNumber,
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
  String _outletName = '';
  String _selectedCategory = '';
  late String _tableNumber;

  // ── gRPC ──
  ClientChannel? _channel;
  DeviceServiceClient? _deviceClient;
  MenuServiceClient? _menuClient;
  OrderServiceClient? _orderClient;
  CallOptions? _callOptions;
  Timer? _heartbeatTimer;
  int _heartbeatFailCount = 0;
  int _heartbeatSuccessCount = 0;
  static const int _maxHeartbeatFailsBeforeOffline = 2;
  static const int _minHeartbeatSuccessesBeforeOnline = 2;

  // ── Decoupled services ──
  late final AdPlayerService _adPlayer;
  late final AdSyncService _adSync;
  late final MenuImageCache _imageCache;
  final CartNotifier _cart = CartNotifier();
  final MenuNotifier _menu = MenuNotifier();

  // ── Back-online banner ──
  bool _backOnlineVisible = false;
  Timer? _backOnlineTimer;

  // ── Close table / payment state ──
  Map<String, dynamic>? _tableSession;

  // ── Timers ──
  Timer? _inactivityTimer;

  // ── Controllers ──
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _tableNumber = widget.tableNumber;

    _adPlayer = AdPlayerService(onImpression: _trackAdImpression);
    _adSync = AdSyncService(
      serverHost: widget.serverHost,
      token: widget.token,
      adsDirectory: kAdsDirectoryPath,
      onPlaylistUpdated: _onPlaylistUpdated,
    );
    _imageCache = MenuImageCache(serverHost: widget.serverHost);

    // ═══ CRITICAL ANR FIX ═══
    WidgetsBinding.instance.addPostFrameCallback((_) => _deferredBootstrap());
  }

  WebSocket? _socket;
  bool _isWsConnected = false;

  // ────────────────── Deferred bootstrap ──────────────────

  Future<void> _deferredBootstrap() async {
    _initGrpc();
    await _registerAndStartHeartbeat();
    await _fetchMenu();
    await _bootAds();
    _initWebSocket();

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

  void _initWebSocket() async {
    _socket?.close();
    try {
      final host = widget.serverHost;
      final wsUrl = 'ws://$host:4200/ws/device?token=${widget.token}';
      debugPrint('[WS] Connecting to $wsUrl');
      
      _socket = await WebSocket.connect(wsUrl).timeout(const Duration(seconds: 10));
      _isWsConnected = true;
      debugPrint('[WS] Connected successfully');

      _socket!.listen(
        (data) {
          try {
            final payload = jsonDecode(data as String) as Map<String, dynamic>;
            final event = payload['event'] as String? ?? '';
            if (event == 'table_session') {
              debugPrint('[WS] Table session payload: $payload');
              _processTableSession(jsonEncode(payload));
            } else if (event == 'reload_menu') {
              debugPrint('[WS] Menu update reload request received');
              _fetchMenu();
            }
          } catch (e) {
            debugPrint('[WS] Error processing msg: $e');
          }
        },
        onError: (err) {
          debugPrint('[WS] Socket error: $err');
          _reconnectWebSocket();
        },
        onDone: () {
          debugPrint('[WS] Socket closed by host');
          _reconnectWebSocket();
        },
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('[WS] Socket connection failed: $e');
      _reconnectWebSocket();
    }
  }

  void _reconnectWebSocket() {
    _isWsConnected = false;
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        _initWebSocket();
      }
    });
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
        final resp = await _deviceClient!.sendHeartbeat(
            HeartbeatRequest()..deviceId = widget.deviceId,
            options: _callOptions);
        if (_heartbeatFailCount > 0) _heartbeatFailCount = 0;
        _heartbeatSuccessCount++;
        if (!_isOnline && _heartbeatSuccessCount >= _minHeartbeatSuccessesBeforeOnline) {
          _markOnline();
        }
        _processTableSession(resp.tableSessionJson);
      } catch (e) {
        _heartbeatFailCount++;
        _heartbeatSuccessCount = 0;
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
      _showBackOnlineBanner();
    }
  }

  void _markOffline() {
    if (_isOnline && mounted) {
      setState(() => _isOnline = false);
    }
  }

  /// Show a non-blocking, auto-dismissing top-right banner instead of a
  /// modal dialog. Auto-dismisses after 3 seconds, OR instantly on any
  /// tap anywhere on the screen.
  void _showBackOnlineBanner() {
    if (!mounted) return;
    setState(() => _backOnlineVisible = true);
    _backOnlineTimer?.cancel();
    _backOnlineTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      setState(() => _backOnlineVisible = false);
    });
  }

  void _dismissBackOnlineBanner() {
    if (!_backOnlineVisible) return;
    _backOnlineTimer?.cancel();
    setState(() => _backOnlineVisible = false);
  }

  Future<void> _fetchMenu() async {
    _menu.setLoading();
    _adSync.progress.value = const SyncProgress(
      isActive: true,
      label: 'Fetching menu...',
      filesCompleted: 0,
      filesTotal: 0,
      bytesDownloaded: 0,
      bytesTotal: 0,
      currentFileName: '',
    );
    try {
      final req = GetMenuRequest()
        ..deviceId = widget.deviceId
        ..merchantId = '';
      final response = await _menuClient!.getMenu(req, options: _callOptions);
      if (mounted) {
        setState(() {
          _outletName = response.message; // server's outlet name; may be empty
          if (_selectedCategory.isEmpty && response.items.isNotEmpty) {
            _selectedCategory = response.items.first.category;
          }
        });
        _menu.setItems(response.items);
        // Cache menu + outletName to SharedPreferences for offline use
        await _cacheMenu(response.items, response.message);
      }
      // Prime the image cache in the background — UI stays responsive.
      // The download_progress_indicator widget (if mounted) will show this.
      unawaited(_imageCache.primeFromMenu(response.items));
    } catch (e) {
      debugPrint('Menu fetch failed: $e');
      if (mounted) {
        _menu.setError();
        // Load cached menu instead of mock data
        await _loadCachedMenu();
      }
    } finally {
      _adSync.progress.value = const SyncProgress.idle();
    }
  }

  Future<void> _cacheMenu(List<MenuItem> items, String outletName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final menuJson = {
        'outletName': outletName,
        'items': items.map((item) => {
          'itemId': item.itemId,
          'name': item.name,
          'description': item.description,
          'price': item.price.toInt(),
          'category': item.category,
          'imageUrl': item.imageUrl,
          'isAvailable': item.isAvailable,
        }).toList(),
      };
      await prefs.setString('cachedMenu', jsonEncode(menuJson));
    } catch (e) {
      debugPrint('Failed to cache menu: $e');
    }
  }

  Future<void> _loadCachedMenu() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedMenuJson = prefs.getString('cachedMenu');
      if (cachedMenuJson == null || cachedMenuJson.isEmpty) return;

      final dynamic decoded = jsonDecode(cachedMenuJson);
      // Support both new shape ({outletName, items}) and the old shape
      // (bare list) for backwards compatibility with previously installed
      // devices.
      List<dynamic> menuData;
      String? cachedOutletName;
      if (decoded is Map<String, dynamic>) {
        cachedOutletName = decoded['outletName'] as String?;
        menuData = decoded['items'] as List<dynamic>? ?? const [];
      } else if (decoded is List) {
        menuData = decoded;
      } else {
        return;
      }

      final items = menuData.map((data) {
        return MenuItem()
          ..itemId = data['itemId'] as String
          ..name = data['name'] as String
          ..description = data['description'] as String? ?? ''
          ..price = Int64(data['price'] as int)
          ..category = data['category'] as String
          ..imageUrl = data['imageUrl'] as String? ?? ''
          ..isAvailable = data['isAvailable'] as bool? ?? true;
      }).toList();

      if (items.isEmpty) return;
      _menu.setItems(items);
      if (mounted) {
        setState(() {
          // Only adopt the cached outletName if we don't already have a
          // fresh one from the server response this session.
          if (_outletName.isEmpty && cachedOutletName != null) {
            _outletName = cachedOutletName;
          }
          if (_selectedCategory.isEmpty) {
            _selectedCategory = items.first.category;
          }
        });
      }
      debugPrint('Loaded ${items.length} items from cache');
    } catch (e) {
      debugPrint('Failed to load cached menu: $e');
    }
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
      _tableSession = null;
    });
    _adSync.syncNow();
    _adPlayer.resume();
    _cancelIdleTimer();
  }

  /// Process table session state from heartbeat: close_table → show QR,
  /// completed → dismiss QR and return to ads.
  void _processTableSession(String? jsonStr) {
    if (jsonStr == null || jsonStr.isEmpty) {
      if (_tableSession != null && _tableSession!['status'] == 'active') {
        setState(() {
          _tableSession = null;
        });
      }
      return;
    }
    try {
      final data = jsonDecode(jsonStr) as Map<String, dynamic>;
      final status = data['status'] as String? ?? '';
      if (status == 'close_table') {
        _adPlayer.pause();
        _cancelIdleTimer();
        setState(() {
          _tableSession = data;
          _isIdle = true;
        });
      } else if (status == 'active') {
        setState(() {
          _tableSession = data;
        });
      } else if (status == 'completed') {
        setState(() => _tableSession = null);
        
        // Show Thank You Popup
        BuildContext? dialogContext;
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (dialogCtx) {
            dialogContext = dialogCtx;
            return AlertDialog(
              shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
              backgroundColor: kCardBg,
              content: const Padding(
                padding: EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.favorite_rounded, color: Colors.pink, size: 64),
                    SizedBox(height: 20),
                    Text(
                      'Thank You!',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: kTextDark,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Do visit again.',
                      style: TextStyle(
                        fontSize: 16,
                        color: kTextGrey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );

        // Auto dismiss after 3 seconds and return to ads
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            if (dialogContext != null) {
              Navigator.pop(dialogContext!);
            }
            _returnToAds();
          }
        });
      }
    } catch (e) {
      debugPrint('Failed to parse table session: $e');
    }
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
        tableNumber: _tableNumber,
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
              content: Text("Order placed successfully! Sent to kitchen."),
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
      builder: (dialogCtx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Text("Enter Exit Password"),
        content: TextField(
          controller: _passwordController,
          obscureText: true,
          autofocus: true,
          decoration: const InputDecoration(hintText: "Enter password to exit kiosk"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () {
              if (_passwordController.text == widget.bypassPassword) {
                Navigator.pop(dialogCtx); // close the dialog
                final kioskCtx = context;
                Navigator.of(kioskCtx).push(
                  MaterialPageRoute<void>(
                    builder: (settingsCtx) => SettingsScreen(
                      serverHost: widget.serverHost,
                      deviceId: widget.deviceId,
                      token: widget.token,
                      hostApplicationId: widget.hostApplicationId,
                      bypassPassword: widget.bypassPassword,
                      tableNumber: _tableNumber,
                      onBackToKiosk: () => Navigator.of(settingsCtx).pop(),
                    ),
                  ),
                );
              } else {
                ScaffoldMessenger.of(dialogCtx).showSnackBar(
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
    _socket?.close();
    _heartbeatTimer?.cancel();
    _inactivityTimer?.cancel();
    _backOnlineTimer?.cancel();
    _passwordController.dispose();
    _adPlayer.dispose();
    _adSync.dispose();
    _imageCache.dispose();
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
            // Show download progress during initial sync
            DownloadProgressIndicator(progress: _adSync.progress),
          ],
        ),
      );
    }

    if (_isIdle) {
      // Show payment QR if table is in close_table mode
      if (_tableSession != null && _tableSession!['status'] == 'close_table') {
        return PaymentQrWidget(
          upiUrl: _tableSession!['upiUrl'] as String? ?? '',
          amountPaise: _tableSession!['amount'] as int? ?? 0,
          orderId: _tableSession!['orderId'] as String? ?? '',
          tableNumber: _tableSession!['tableNumber'] as String? ?? '',
          onUnlock: _promptUnlock,
        );
      }

      return Scaffold(
        body: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: (_) {
            _dismissBackOnlineBanner();
            _enterMenuMode();
          },
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
              // Show download progress during background sync
              DownloadProgressIndicator(progress: _adSync.progress),
              // Non-blocking back-online banner (auto-dismisses in 3s, tap anywhere)
              if (_backOnlineVisible) _buildBackOnlineBanner(),
            ],
          ),
        ),
      );
    }

    return Listener(
      onPointerDown: (_) {
        if (_backOnlineVisible) _dismissBackOnlineBanner();
        _resetIdleTimer();
      },
      child: Scaffold(
        backgroundColor: kScaffoldBg,
        body: SafeArea(
          child: Stack(
            children: [
              Column(
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
              // Show download progress during background sync
              DownloadProgressIndicator(progress: _adSync.progress),
              // Non-blocking back-online banner (auto-dismisses in 3s, tap anywhere)
              if (_backOnlineVisible) _buildBackOnlineBanner(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackOnlineBanner() {
    return Positioned(
      top: 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Container(
            key: const ValueKey('back-online-banner'),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.green.shade600,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_done_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text(
                  'Back Online',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
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
              imageCache: _imageCache,
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
                imageCache: _imageCache,
              ),
            ),
          ],
        ),
        _buildFloatingCartBar(),
        _buildLiveSessionStatusBar(),
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
                padding: const EdgeInsets.all(22),
                child: const Icon(Icons.arrow_back, color: kTextDark, size: 32),
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
          child: GestureDetector(
            onTap: _isOnline ? () => setState(() => _showCart = true) : null,
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
                    Container(
                      decoration: BoxDecoration(
                        color: kAccentBlue,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      child: const Row(
                        children: [
                          Text("View Cart", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                          SizedBox(width: 8),
                          Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
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
          ),
        );
      },
    );
  }

  Widget _buildLiveSessionStatusBar() {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: _cart,
      builder: (context, cart, _) {
        if (!cart.isEmpty || _tableSession == null || _tableSession!['status'] != 'active') {
          return const SizedBox.shrink();
        }

        final orderStatus = _tableSession!['orderStatus'] as String? ?? 'placed';
        final amountPaise = _tableSession!['amount'] as int? ?? 0;
        final orderId = _tableSession!['orderId'] as String? ?? '';
        final amountFormatted = (amountPaise / 100).toStringAsFixed(2);

        IconData iconData;
        Color iconColor;
        String statusTitle;
        String statusSubtitle;

        switch (orderStatus.toLowerCase()) {
          case 'placed':
            iconData = Icons.pending_actions_rounded;
            iconColor = Colors.amber.shade600;
            statusTitle = 'Order Placed';
            statusSubtitle = 'Waiting for kitchen confirmation…';
            break;
          case 'confirmed':
            iconData = Icons.check_circle_outline_rounded;
            iconColor = Colors.green.shade600;
            statusTitle = 'Order Confirmed';
            statusSubtitle = 'Preparing your food shortly…';
            break;
          case 'cooking':
            iconData = Icons.soup_kitchen_rounded;
            iconColor = Colors.blue.shade600;
            statusTitle = 'Preparing & Cooking';
            statusSubtitle = 'Chefs are working on your food!';
            break;
          case 'served':
            iconData = Icons.restaurant_rounded;
            iconColor = const Color(0xFF059669);
            statusTitle = 'Delivered & Served';
            statusSubtitle = 'Enjoy your meal!';
            break;
          case 'cancelled':
            iconData = Icons.cancel_outlined;
            iconColor = Colors.red.shade600;
            statusTitle = 'Order Cancelled';
            statusSubtitle = 'Please contact the staff.';
            break;
          default:
            iconData = Icons.receipt_long_rounded;
            iconColor = kTextGrey;
            statusTitle = 'Active Order';
            statusSubtitle = 'Status: $orderStatus';
        }

        return Positioned(
          bottom: 24,
          left: 144,
          right: 24,
          child: Container(
            height: 76,
            decoration: BoxDecoration(
              color: kAccentBlue,
              borderRadius: kFloatingCartBorderRadius,
              border: Border.all(color: const Color(0xFF1E1B4B), width: 3.0),
              boxShadow: const [
                BoxShadow(color: Colors.black38, blurRadius: 12, offset: Offset(0, 4)),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                      padding: const EdgeInsets.all(10),
                      child: Icon(iconData, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          statusTitle,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          statusSubtitle,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Total: ₹$amountFormatted',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'ID: $orderId',
                      style: TextStyle(
                        fontSize: 9,
                        color: Colors.white.withValues(alpha: 0.75),
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
