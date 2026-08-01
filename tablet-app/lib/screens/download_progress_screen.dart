import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:grpc/grpc.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';
import '../generated/menu.pbgrpc.dart';
import '../ad_sync_service.dart';
import '../menu_image_cache.dart';
import 'kiosk_screen.dart';

// ═══════════════════════════════════════════════════════════════════
//  DOWNLOAD PROGRESS SCREEN
//
//  Shown immediately after device activation. Downloads ads + menu
//  from the server and shows live progress. When everything is ready
//  the user taps "Enter Kiosk" to start playing ads.
// ═══════════════════════════════════════════════════════════════════

class DownloadProgressScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final String tableNumber;

  const DownloadProgressScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.tableNumber,
  });

  @override
  State<DownloadProgressScreen> createState() => _DownloadProgressScreenState();
}

class _DownloadProgressScreenState extends State<DownloadProgressScreen> {
  // ── State ──
  bool _adsDone = false;
  bool _menuDone = false;
  bool _imagesDone = false;
  int _adsCount = 0;
  int _menuCount = 0;
  int _imageCount = 0;
  String _adsStatus = 'Starting...';
  String _menuStatus = 'Starting...';
  String _imageStatus = 'Starting...';
  String? _error;

  // ── Services ──
  ClientChannel? _channel;
  MenuServiceClient? _menuClient;
  AdSyncService? _adSync;
  MenuImageCache? _imageCache;
  StreamSubscription? _progressSub;
  VoidCallback? _progressListener;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  @override
  void dispose() {
    if (_progressListener != null) {
      _adSync?.progress.removeListener(_progressListener!);
    }
    _progressSub?.cancel();
    _adSync?.dispose();
    _imageCache?.dispose();
    _channel?.shutdown();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _adsStatus = 'Connecting to server...';
      _menuStatus = 'Connecting to server...';
    });
    try {
      _initGrpc();
      await _downloadMenu();
      await _downloadAds();
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Initialization failed: $e');
      }
    }
  }

  void _initGrpc() {
    _channel = ClientChannel(
      widget.serverHost,
      port: 4201,
      options: const ChannelOptions(credentials: ChannelCredentials.insecure()),
    );
    _menuClient = MenuServiceClient(_channel!);
  }

  CallOptions get _callOptions => CallOptions(
        metadata: {'authorization': 'Bearer ${widget.token}'},
        timeout: kHttpTimeout,
      );

  Future<void> _downloadMenu() async {
    setState(() => _menuStatus = 'Fetching menu...');
    try {
      final req = GetMenuRequest()
        ..deviceId = widget.deviceId
        ..merchantId = '';
      final resp = await _menuClient!.getMenu(req, options: _callOptions);
      final prefs = await SharedPreferences.getInstance();
      final outletName = resp.message.isNotEmpty ? resp.message : '';
      final menuJson = {
        'outletName': outletName,
        'items': resp.items.map((item) => {
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

      // Prime image cache right after we have the menu list
      _imageCache = MenuImageCache(serverHost: widget.serverHost);
      setState(() {
        _menuCount = resp.items.length;
        _menuDone = true;
        _menuStatus = 'Done — ${resp.items.length} items loaded';
        _imageStatus = 'Caching ${resp.items.length} images...';
      });
      // Run priming in background; UI flips the third step to done when it
      // completes (see _imageCachePrime).
      unawaited(_imageCachePrime(resp.items.toList()));
    } catch (e) {
      if (mounted) {
        setState(() {
          _menuDone = true;
          _imagesDone = true; // no menu = no images to cache; unblock
          _menuStatus = 'Menu fetch failed — will use cache if available';
          _imageStatus = 'Skipped (no menu)';
        });
      }
    }
  }

  Future<void> _imageCachePrime(List<MenuItem> items) async {
    if (_imageCache == null) return;
    try {
      final newCount = await _imageCache!.primeFromMenu(items);
      if (!mounted) return;
      setState(() {
        _imagesDone = true;
        _imageCount = newCount;
        _imageStatus = newCount == 0
            ? 'All images already cached'
            : 'Done — $newCount images cached';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _imagesDone = true;
        _imageStatus = 'Image cache failed: $e';
      });
    }
  }

  Future<void> _downloadAds() async {
    setState(() => _adsStatus = 'Initializing...');
    _adSync = AdSyncService(
      serverHost: widget.serverHost,
      token: widget.token,
      adsDirectory: kAdsDirectoryPath,
    );
    _progressListener = _onProgress;
    _adSync!.progress.addListener(_progressListener!);

    try {
      final dir = Directory(kAdsDirectoryPath);
      if (!await dir.exists()) await dir.create(recursive: true);

      final playlist = await _adSync!.boot();
      if (mounted) {
        setState(() {
          _adsCount = playlist.length;
          _adsDone = true;
          _adsStatus = playlist.isEmpty
              ? 'No ads available for this outlet'
              : 'Done — ${playlist.length} ads ready';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _adsDone = true;
          _adsStatus = 'Ad sync failed: $e';
        });
      }
    }
  }

  void _onProgress() {
    if (!mounted || _adSync == null) return;
    final p = _adSync!.progress.value;
    if (p.isActive && p.filesTotal > 0) {
      setState(() {
        _adsStatus = '${p.filesCompleted}/${p.filesTotal} — ${p.currentFileName}';
      });
    }
  }

  void _continueToKiosk() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => KioskScreen(
          serverHost: widget.serverHost,
          deviceId: widget.deviceId,
          token: widget.token,
          hostApplicationId: widget.hostApplicationId,
          bypassPassword: widget.bypassPassword,
          tableNumber: widget.tableNumber,
          onReset: () {}, // unused here
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canEnter = _adsDone && _menuDone && _imagesDone;
    return Scaffold(
      backgroundColor: kScaffoldBg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.cloud_download, color: Colors.blueAccent, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Preparing your kiosk',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: kTextDark,
                          ),
                        ),
                        Text(
                          '${widget.deviceId}  •  ${widget.tableNumber}',
                          style: const TextStyle(fontSize: 12, color: kTextGrey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              _buildStep(
                title: 'Food menu',
                icon: Icons.restaurant_menu,
                done: _menuDone,
                status: _menuStatus,
                detail: _menuDone ? '$_menuCount items' : null,
              ),
              const SizedBox(height: 16),
              _buildStep(
                title: 'Menu images',
                icon: Icons.image_outlined,
                done: _imagesDone,
                status: _imageStatus,
                detail: _imagesDone ? '$_imageCount new' : null,
              ),
              const SizedBox(height: 16),
              _buildStep(
                title: 'Ad campaigns',
                icon: Icons.video_library,
                done: _adsDone,
                status: _adsStatus,
                detail: _adsDone ? '$_adsCount files' : null,
              ),
              const Spacer(),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              ElevatedButton(
                onPressed: canEnter ? _continueToKiosk : null,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  backgroundColor: Colors.blueAccent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                  canEnter ? 'Enter Kiosk' : 'Downloading...',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep({
    required String title,
    required IconData icon,
    required bool done,
    required String status,
    String? detail,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kCardBg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: done ? Colors.green.shade50 : Colors.blue.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              done ? Icons.check_rounded : icon,
              color: done ? Colors.green : Colors.blueAccent,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: kTextDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  status,
                  style: const TextStyle(fontSize: 12, color: kTextGrey),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (!done)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.blueAccent)),
            )
          else if (detail != null)
            Text(
              detail,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: kTextDark,
              ),
            ),
        ],
      ),
    );
  }
}
