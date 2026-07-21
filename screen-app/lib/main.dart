import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:grpc/grpc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:video_player/video_player.dart';
import 'package:permission_handler/permission_handler.dart';

import 'generated/device.pbgrpc.dart';

// ---------------------------------------------------------------------------
// App State Machine
// ---------------------------------------------------------------------------
enum PlayerState { booting, waiting, playing }

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token') ?? '';
  final serverHost = prefs.getString('serverHost') ?? '';
  final deviceId = prefs.getString('deviceId') ?? '';
  final hostApplicationId = prefs.getString('hostApplicationId') ?? '';

  runApp(LandscapeAdScreenApp(
    initialActivated: token.isNotEmpty,
    initialServerHost: serverHost,
    initialDeviceId: deviceId,
    initialToken: token,
    initialHostApplicationId: hostApplicationId,
  ));
}

class LandscapeAdScreenApp extends StatelessWidget {
  final bool initialActivated;
  final String initialServerHost;
  final String initialDeviceId;
  final String initialToken;
  final String initialHostApplicationId;

  const LandscapeAdScreenApp({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DigiAds Screen',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.indigo,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF030712),
      ),
      home: MainDeviceRouter(
        initialActivated: initialActivated,
        initialServerHost: initialServerHost,
        initialDeviceId: initialDeviceId,
        initialToken: initialToken,
        initialHostApplicationId: initialHostApplicationId,
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

  const MainDeviceRouter({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
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

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _isActivated = widget.initialActivated;
    _serverHost = widget.initialServerHost;
    _deviceId = widget.initialDeviceId;
    _token = widget.initialToken;
    _hostApplicationId = widget.initialHostApplicationId;
  }

  void _onActivate(String serverHost, String deviceId, String token, String hostApplicationId) {
    setState(() {
      _serverHost = serverHost;
      _deviceId = deviceId;
      _token = token;
      _hostApplicationId = hostApplicationId;
      _isActivated = true;
    });
  }

  void _onReset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('serverHost');
    await prefs.remove('deviceId');
    await prefs.remove('hostApplicationId');

    setState(() {
      _isActivated = false;
      _serverHost = '';
      _deviceId = '';
      _token = '';
      _hostApplicationId = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (!_isActivated) {
      return ScreenSetupScreen(onActivate: _onActivate);
    }
    return AdPlayerScreen(
      serverHost: _serverHost,
      deviceId: _deviceId,
      token: _token,
      hostApplicationId: _hostApplicationId,
      onReset: _onReset,
    );
  }
}

// ---------------------------------------------------------------------------
// Setup Screen (unchanged except minor fixes)
// ---------------------------------------------------------------------------
class ScreenSetupScreen extends StatefulWidget {
  final Function(String, String, String, String) onActivate;
  const ScreenSetupScreen({super.key, required this.onActivate});

  @override
  State<ScreenSetupScreen> createState() => _ScreenSetupScreenState();
}

class _ScreenSetupScreenState extends State<ScreenSetupScreen> {
  final _serverHostController = TextEditingController(text: '10.0.2.2');
  final _deviceIdController = TextEditingController();
  String _error = '';
  bool _loading = false;

  void _submit() async {
    setState(() {
      _error = '';
      _loading = true;
    });

    var serverHost = _serverHostController.text.trim();
    if (serverHost.startsWith('http://')) {
      serverHost = serverHost.replaceAll('http://', '');
    } else if (serverHost.startsWith('https://')) {
      serverHost = serverHost.replaceAll('https://', '');
    }
    if (serverHost.contains(':')) {
      serverHost = serverHost.split(':').first;
    }
    final deviceId = _deviceIdController.text.trim();

    if (serverHost.isEmpty || deviceId.isEmpty) {
      setState(() {
        _error = 'All fields are required';
        _loading = false;
      });
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      String? hardwareId = prefs.getString('hardware_id');
      if (hardwareId == null) {
        hardwareId = 'hw_scr_${DateTime.now().millisecondsSinceEpoch}_$deviceId';
        await prefs.setString('hardware_id', hardwareId);
      }

      final url = Uri.parse('http://$serverHost:4200/api/v1/auth/device/activate');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceId': deviceId,
          'hardwareId': hardwareId,
          'deviceType': 'screen',
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

        widget.onActivate(serverHost, deviceId, token, hostApplicationId);
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
        color: const Color(0xFF030712),
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              width: 420,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.settings_suggest, size: 64, color: Colors.indigoAccent),
                  const SizedBox(height: 16),
                  const Text(
                    "Wall Display Setup",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "One-time authorization setup for ad playback screen.",
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
                      labelText: "Device ID (e.g. DEV_SCR_XXXX)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.tv),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.indigoAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _loading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text("Authorize & Bind Screen", style: TextStyle(fontWeight: FontWeight.bold)),
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

// ---------------------------------------------------------------------------
// AD PLAYER SCREEN — Robust Offline-First 24/7 Playback Engine
// ---------------------------------------------------------------------------
class AdPlayerScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final VoidCallback onReset;

  const AdPlayerScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.onReset,
  });

  @override
  State<AdPlayerScreen> createState() => _AdPlayerScreenState();
}

class _AdPlayerScreenState extends State<AdPlayerScreen> with WidgetsBindingObserver {
  // gRPC
  late ClientChannel _channel;
  late DeviceServiceClient _deviceClient;
  late CallOptions _callOptions;
  Timer? _heartbeatTimer;

  // ---------- State Machine ----------
  PlayerState _playerState = PlayerState.booting;
  String _statusMessage = 'Initializing...';

  // ---------- Playlist ----------
  List<String> _localPlaylist = []; // file paths or 'static__...' strings
  int _currentAdIndex = 0;

  // ---------- Video Controllers (double-buffer) ----------
  VideoPlayerController? _activeController;
  VideoPlayerController? _preloadedController;

  // ---------- Playback monitoring ----------
  Timer? _positionPollTimer;
  Timer? _watchdogTimer;
  Timer? _staticAdTimer;
  Duration _lastKnownPosition = Duration.zero;
  int _positionStallCount = 0;

  // ---------- Sync & Download ----------
  bool _isSyncing = false;
  Timer? _syncTimer;
  int _syncRetryCount = 0;
  String _downloadProgress = '';

  // ---------- Storage directory ----------
  late String _adsDirectory;

  // ---------- Ad scheduling & frequency ----------
  List<String> _masterAdPlaylist = [];
  Map<String, int> _adFrequencies = {};
  Map<String, int> _lastPlayedTimes = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _boot();
  }

  // =====================================================================
  // BOOT SEQUENCE
  // =====================================================================
  void _boot() async {
    print('[BOOT] Starting offline-first boot sequence...');

    // 1. Ensure storage permissions and directory
    await _ensureStorageReady();

    // 2. Load cached playlist and start playback immediately if available
    await _loadCachedPlaylist();

    // 3. Init gRPC for heartbeat / telemetry
    _initGrpc();
    _startHeartbeat();

    // 4. Attempt server sync in background (won't block playback)
    _attemptSync();

    // Local timer to check for ad unlocks periodically when the playlist is empty
    Timer.periodic(const Duration(seconds: 30), (timer) {
      if (mounted) {
        if (_playerState != PlayerState.booting && _localPlaylist.isEmpty && _masterAdPlaylist.isNotEmpty) {
          final eligible = _getEligiblePlaylist(_masterAdPlaylist);
          if (eligible.isNotEmpty) {
            print('[SCHEDULER] Ads unlocked! Resuming ad loop.');
            setState(() {
              _localPlaylist = eligible;
              _playerState = PlayerState.playing;
              _statusMessage = '';
            });
            _startPlaybackLoop();
          }
        }
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _ensureStorageReady() async {
    // Request storage permission on Android
    if (Platform.isAndroid) {
      final status = await Permission.manageExternalStorage.request();
      if (!status.isGranted) {
        // Fall back to requesting regular storage
        await Permission.storage.request();
      }
    }

    // Create ads directory in external storage root
    _adsDirectory = '/sdcard/AIBotInk/ads';
    final dir = Directory(_adsDirectory);
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
      print('[STORAGE] Created ads directory: $_adsDirectory');
    } else {
      print('[STORAGE] Ads directory exists: $_adsDirectory');
    }
  }

  // =====================================================================
  // CACHED PLAYLIST LOADING (Offline-First)
  // =====================================================================
  Future<void> _loadCachedPlaylist() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getStringList('local_playlist') ?? [];

    if (cached.isNotEmpty) {
      // Filter to only files that still exist on disk
      final validFiles = <String>[];
      for (final path in cached) {
        if (path.startsWith('static__')) {
          validFiles.add(path);
        } else if (File(path).existsSync() && File(path).lengthSync() > 1000) {
          validFiles.add(path);
        }
      }

      if (validFiles.isNotEmpty) {
        print('[BOOT] Found ${validFiles.length} cached ads on disk. Starting playback.');
        _masterAdPlaylist = List.from(validFiles);
        await _loadFrequenciesAndTimestamps();
        final eligible = _getEligiblePlaylist(_masterAdPlaylist);
        setState(() {
          _localPlaylist = eligible;
          _playerState = PlayerState.playing;
          _statusMessage = '';
        });
        _startPlaybackLoop();
        return;
      }
    }

    // Also scan the ads directory for any .mp4/.webm files (recovery fallback)
    final dir = Directory(_adsDirectory);
    if (dir.existsSync()) {
      final files = dir.listSync().whereType<File>().where((f) {
        final name = f.path.split('/').last;
        return (name.endsWith('.mp4') || name.endsWith('.webm')) && f.lengthSync() > 1000;
      }).toList();

      if (files.isNotEmpty) {
        final recovered = files.map((f) => f.path).toList();
        print('[BOOT] Recovered ${recovered.length} video files from disk scan.');
        await prefs.setStringList('local_playlist', recovered);
        _masterAdPlaylist = List.from(recovered);
        await _loadFrequenciesAndTimestamps();
        final eligible = _getEligiblePlaylist(_masterAdPlaylist);
        setState(() {
          _localPlaylist = eligible;
          _playerState = PlayerState.playing;
          _statusMessage = '';
        });
        _startPlaybackLoop();
        return;
      }
    }

    // No cached content at all — enter waiting state
    print('[BOOT] No cached ads found. Entering waiting state.');
    setState(() {
      _playerState = PlayerState.waiting;
      _statusMessage = 'Connecting to server...';
    });
  }

  // =====================================================================
  // gRPC SETUP & HEARTBEAT
  // =====================================================================
  void _initGrpc() {
    _channel = ClientChannel(
      widget.serverHost,
      port: 4201,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );

    _deviceClient = DeviceServiceClient(_channel);
    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: const Duration(seconds: 10),
    );
  }

  void _startHeartbeat() async {
    // Initial registration
    try {
      final req = RegisterDeviceRequest()
        ..deviceId = widget.deviceId
        ..deviceType = 'screen'
        ..hostApplicationId = widget.hostApplicationId;
      await _deviceClient.registerDevice(req, options: _callOptions);
      print('[gRPC] Screen registered successfully');
    } catch (e) {
      print('[gRPC] Screen registration failed: $e');
    }

    // Periodic heartbeat
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      try {
        await _deviceClient.sendHeartbeat(
          HeartbeatRequest()..deviceId = widget.deviceId,
          options: _callOptions,
        );
      } catch (e) {
        // Heartbeat failure is non-critical, just log it
      }
    });
  }

  // =====================================================================
  // SERVER SYNC — Connection-aware with retry
  // =====================================================================
  void _attemptSync() async {
    if (_isSyncing) return;

    print('[SYNC] Attempting server sync (retry #$_syncRetryCount)...');

    try {
      final url = Uri.parse('http://${widget.serverHost}:4200/api/v1/auth/device/ads');
      final response = await http.get(
        url,
        headers: {'Authorization': 'Bearer ${widget.token}'},
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final List serverAds = data['data'] ?? [];
        _syncRetryCount = 0;

        print('[SYNC] Server reachable. Got ${serverAds.length} ads.');

        if (serverAds.isNotEmpty) {
          await _syncAndDownloadAds(serverAds);
        } else {
          print('[SYNC] Server returned empty ads list.');
        }

        // Schedule periodic re-sync every 5 minutes
        _schedulePeriodicSync();
        return;
      }
    } catch (e) {
      print('[SYNC] Failed to reach server: $e');
    }

    // Sync failed — schedule retry with backoff
    _scheduleRetrySync();
  }

  void _scheduleRetrySync() {
    _syncTimer?.cancel();
    _syncRetryCount++;
    // Backoff: 10s for testing
    final delay = const Duration(seconds: 10);

    print('[SYNC] Scheduling retry in ${delay.inSeconds}s (attempt #$_syncRetryCount)');

    if (mounted) {
      setState(() {
        _statusMessage = 'Server unreachable. Retrying in ${delay.inSeconds}s...';
      });
    }

    _syncTimer = Timer(delay, () {
      if (mounted) _attemptSync();
    });
  }

  void _schedulePeriodicSync() {
    _syncTimer?.cancel();
    _syncRetryCount = 0;

    // Re-sync every 10 seconds for testing
    _syncTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) _attemptSync();
    });
  }

  // =====================================================================
  // DOWNLOAD ENGINE — Per-file retry with validation
  // =====================================================================
  Future<void> _syncAndDownloadAds(List<dynamic> serverAds) async {
    if (_isSyncing) return;
    _isSyncing = true;

    if (mounted) {
      setState(() => _downloadProgress = 'Syncing ads...');
    }

    try {
      // Save frequencies mapping to cache
      final prefs = await SharedPreferences.getInstance();
      final Map<String, int> frequencies = {};
      for (final ad in serverAds) {
        final bookingId = ad['bookingId'] as String? ?? 'unknown';
        final freqMin = ad['frequencyMinutes'] as int? ?? 0;
        frequencies[bookingId] = freqMin;
      }
      await prefs.setString('ad_frequencies_map', jsonEncode(frequencies));

      final List<String> newLocalPaths = [];
      final List<String> activeFileNames = [];

      for (int i = 0; i < serverAds.length; i++) {
        final ad = serverAds[i];
        final mediaUrl = ad['mediaUrl'] as String? ?? '';
        final bookingId = ad['bookingId'] as String? ?? 'unknown';

        if (mediaUrl.isNotEmpty &&
            (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'))) {
          // Build absolute download URL
          final absoluteUrl = mediaUrl.startsWith('http')
              ? mediaUrl
              : 'http://${widget.serverHost}:4200$mediaUrl';

          final fileExt = mediaUrl.split('.').last;
          final fileName = 'ad_$bookingId.$fileExt';
          final localFile = File('$_adsDirectory/$fileName');
          activeFileNames.add(fileName);

          // Download if file doesn't exist or is too small (corrupt)
          if (!localFile.existsSync() || localFile.lengthSync() < 1000) {
            final success = await _downloadWithRetry(absoluteUrl, localFile, i + 1, serverAds.length);
            if (!success) {
              print('[DOWNLOAD] Skipping ad $bookingId after failed download.');
              continue;
            }
          } else {
            print('[DOWNLOAD] Ad $bookingId already cached: ${localFile.path} (${(localFile.lengthSync() / 1024).round()} KB)');
          }

          newLocalPaths.add(localFile.path);
        } else {
          // Non-video ad (static card)
          newLocalPaths.add(
            'static__${ad['bookingId']}__${ad['title'] ?? ''}__${ad['subtitle'] ?? ad['description'] ?? ''}',
          );
        }
      }

      // Update playlist, handle playback transition and file cleanup safely
      await _updatePlaylist(newLocalPaths, activeFileNames);
    } catch (e) {
      print('[SYNC] Download error: $e');
      if (mounted) {
        setState(() => _downloadProgress = 'Sync failed. Using cache.');
      }
      // Clear status after 3 seconds
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _downloadProgress = '');
      });
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _updatePlaylist(List<String> newPlaylist, List<String> activeFileNames) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('local_playlist', newPlaylist);
    await prefs.setString('last_sync_time', DateTime.now().toIso8601String());

    _masterAdPlaylist = List.from(newPlaylist);
    await _loadFrequenciesAndTimestamps();
    final eligible = _getEligiblePlaylist(_masterAdPlaylist);

    if (!mounted) return;

    if (eligible.isEmpty) {
      print('[PLAYER] New playlist is empty. Stopping playback.');
      _stopPlaybackMonitoring();
      _disposeActiveController();
      _preloadedController?.dispose();
      _preloadedController = null;
      setState(() {
        _localPlaylist = [];
        _playerState = PlayerState.waiting;
        _statusMessage = 'No ads available. Waiting for content...';
      });
      _cleanupOldFiles(activeFileNames);
      return;
    }

    final isPlaying = _playerState == PlayerState.playing;

    if (!isPlaying) {
      // Not playing yet (waiting or booting) -> start loop
      setState(() {
        _localPlaylist = eligible;
        _playerState = PlayerState.playing;
        _statusMessage = '';
      });
      _cleanupOldFiles(activeFileNames);
      _startPlaybackLoop();
      return;
    }

    // Currently playing -> check if the active ad is still in the new playlist
    final currentPlayingSource = _localPlaylist.isNotEmpty && _currentAdIndex < _localPlaylist.length
        ? _localPlaylist[_currentAdIndex]
        : '';

    final currentPlayingIndexInNew = eligible.indexOf(currentPlayingSource);

    if (currentPlayingIndexInNew != -1) {
      // Currently playing ad is still valid. Just update playlist and index
      print('[PLAYER] Playlist updated. Currently playing ad is still valid.');
      setState(() {
        _localPlaylist = eligible;
        _currentAdIndex = currentPlayingIndexInNew;
        _downloadProgress = '';
      });
      // Re-preload the next ad just in case the next ad changed
      _preloadedController?.dispose();
      _preloadedController = null;
      _preloadNextAd();
      
      _cleanupOldFiles(activeFileNames);
    } else {
      // Currently playing ad was revoked/deleted or is now scheduled out!
      print('[PLAYER] Currently playing ad is no longer active. Stopping and advancing.');
      
      // 1. Stop active playback & dispose so the file is unlocked
      _stopPlaybackMonitoring();
      _disposeActiveController();
      _preloadedController?.dispose();
      _preloadedController = null;

      // 2. Update playlist in state
      setState(() {
        _localPlaylist = eligible;
        _currentAdIndex = _currentAdIndex % eligible.length;
        _downloadProgress = '';
      });

      // 3. Delete files safely now that controllers are disposed
      _cleanupOldFiles(activeFileNames);

      // 4. Start playing the next ad
      _playCurrentAd();
    }
  }

  Future<bool> _downloadWithRetry(String url, File targetFile, int current, int total) async {
    const maxRetries = 3;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (mounted) {
          setState(() => _downloadProgress = 'Downloading ad $current/$total (attempt $attempt)...');
        }

        print('[DOWNLOAD] Attempt $attempt: $url');
        final response = await http.get(Uri.parse(url)).timeout(const Duration(minutes: 5));

        if (response.statusCode == 200 && response.bodyBytes.length > 1000) {
          await targetFile.writeAsBytes(response.bodyBytes);
          final sizeKB = (targetFile.lengthSync() / 1024).round();
          print('[DOWNLOAD] Success: ${targetFile.path} ($sizeKB KB)');
          return true;
        } else {
          print('[DOWNLOAD] Bad response: status=${response.statusCode}, size=${response.bodyBytes.length}');
        }
      } catch (e) {
        print('[DOWNLOAD] Attempt $attempt failed: $e');
      }

      // Wait before retry
      if (attempt < maxRetries) {
        await Future.delayed(Duration(seconds: 2 * attempt));
      }
    }

    return false;
  }

  void _cleanupOldFiles(List<String> activeFileNames) {
    try {
      final dir = Directory(_adsDirectory);
      if (!dir.existsSync()) return;

      for (var entity in dir.listSync()) {
        if (entity is File) {
          final name = entity.path.split('/').last.split('\\').last;
          if (name.startsWith('ad_') && !activeFileNames.contains(name)) {
            print('[CLEANUP] Removing old ad file: ${entity.path}');
            entity.deleteSync();
          }
        }
      }
    } catch (e) {
      print('[CLEANUP] Error: $e');
    }
  }

  // =====================================================================
  // PLAYBACK ENGINE — Position-polling + Watchdog + Double-Buffer
  // =====================================================================
  void _startPlaybackLoop() {
    if (_localPlaylist.isEmpty) return;

    print('[PLAYER] Starting playback loop with ${_localPlaylist.length} ads.');
    _currentAdIndex = 0;
    _playCurrentAd();
  }

  void _playCurrentAd() async {
    // Cancel all existing timers & controllers
    _stopPlaybackMonitoring();
    _disposeActiveController();

    if (_localPlaylist.isEmpty) {
      print('[PLAYER] Playlist is empty. Going to waiting state.');
      setState(() {
        _playerState = PlayerState.waiting;
        _statusMessage = 'No ads available. Waiting for content...';
      });
      return;
    }

    // Wrap index safely
    _currentAdIndex = _currentAdIndex % _localPlaylist.length;
    final adSource = _localPlaylist[_currentAdIndex];

    print('[PLAYER] Playing ad index $_currentAdIndex: $adSource');

    if (adSource.startsWith('static__')) {
      // Static text ad — show for 8 seconds then advance
      if (mounted) setState(() {});
      _staticAdTimer = Timer(const Duration(seconds: 8), () {
        _trackImpression(adSource);
        _advanceToNextAd();
      });
    } else {
      // Video ad
      final file = File(adSource);
      if (!file.existsSync() || file.lengthSync() < 1000) {
        print('[PLAYER] File missing or corrupt: $adSource. Skipping.');
        _advanceToNextAd();
        return;
      }

      // Check if we have a preloaded controller ready for this index
      if (_preloadedController != null && _preloadedController!.value.isInitialized) {
        print('[PLAYER] Using preloaded controller.');
        _activeController = _preloadedController;
        _preloadedController = null;

        if (mounted) setState(() {});
        _activeController!.play();
        _startPlaybackMonitoring();
        _preloadNextAd();
        return;
      }

      // No preloaded — initialize fresh
      try {
        final controller = VideoPlayerController.file(file);
        await controller.initialize();

        if (!mounted) {
          controller.dispose();
          return;
        }

        _activeController = controller;
        setState(() {});
        controller.play();
        controller.setLooping(false);

        _startPlaybackMonitoring();
        _preloadNextAd();
      } catch (e) {
        print('[PLAYER] Video init failed: $e. Skipping.');
        _advanceToNextAd();
      }
    }
  }

  void _preloadNextAd() {
    if (_localPlaylist.length <= 1) return;

    final nextIndex = (_currentAdIndex + 1) % _localPlaylist.length;
    final nextSource = _localPlaylist[nextIndex];

    if (nextSource.startsWith('static__')) return; // No preload needed for static

    final file = File(nextSource);
    if (!file.existsSync() || file.lengthSync() < 1000) return;

    // Dispose any existing preloaded controller
    _preloadedController?.dispose();
    _preloadedController = null;

    final controller = VideoPlayerController.file(file);
    controller.initialize().then((_) {
      if (mounted && nextIndex == (_currentAdIndex + 1) % _localPlaylist.length) {
        _preloadedController = controller;
        print('[PRELOAD] Next ad ready: $nextSource');
      } else {
        controller.dispose();
      }
    }).catchError((e) {
      print('[PRELOAD] Failed: $e');
    });
  }

  // =====================================================================
  // POSITION POLLING + WATCHDOG (replaces unreliable completion listener)
  // =====================================================================
  void _startPlaybackMonitoring() {
    _lastKnownPosition = Duration.zero;
    _positionStallCount = 0;

    // Poll position every 200ms to detect video end
    _positionPollTimer = Timer.periodic(const Duration(milliseconds: 200), (_) {
      if (_activeController == null || !_activeController!.value.isInitialized) return;

      final pos = _activeController!.value.position;
      final dur = _activeController!.value.duration;

      // Check if video has reached the end (within 500ms tolerance)
      if (dur > Duration.zero && pos >= dur - const Duration(milliseconds: 500)) {
        print('[PLAYER] Video completed (pos: ${pos.inMilliseconds}ms, dur: ${dur.inMilliseconds}ms)');
        _trackImpression(_localPlaylist[_currentAdIndex]);
        _advanceToNextAd();
        return;
      }

      // Check for errors
      if (_activeController!.value.hasError) {
        print('[PLAYER] Video error detected: ${_activeController!.value.errorDescription}');
        _advanceToNextAd();
      }
    });

    // Watchdog: if position doesn't advance for 5 seconds, force-advance
    _watchdogTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_activeController == null || !_activeController!.value.isInitialized) return;

      final pos = _activeController!.value.position;
      if (pos == _lastKnownPosition && pos > Duration.zero) {
        _positionStallCount++;
        if (_positionStallCount >= 5) {
          print('[WATCHDOG] Video stalled for 5s at ${pos.inMilliseconds}ms. Force-advancing.');
          _positionStallCount = 0;
          _trackImpression(_localPlaylist[_currentAdIndex]);
          _advanceToNextAd();
        }
      } else {
        _positionStallCount = 0;
        _lastKnownPosition = pos;
      }
    });
  }

  void _stopPlaybackMonitoring() {
    _positionPollTimer?.cancel();
    _positionPollTimer = null;
    _watchdogTimer?.cancel();
    _watchdogTimer = null;
    _staticAdTimer?.cancel();
    _staticAdTimer = null;
    _positionStallCount = 0;
    _lastKnownPosition = Duration.zero;
  }

  // =====================================================================
  // AD ADVANCEMENT — Circular navigation
  // =====================================================================
  void _advanceToNextAd() {
    if (_localPlaylist.isEmpty) return;

    _stopPlaybackMonitoring();

    // Advance to next ad in circular fashion
    final nextIndex = (_currentAdIndex + 1) % _localPlaylist.length;
    final nextSource = _localPlaylist[nextIndex];
    final isNextVideo = !nextSource.startsWith('static__');

    // Dispose active controller
    final oldController = _activeController;
    _activeController = null;

    _currentAdIndex = nextIndex;

    if (isNextVideo && _preloadedController != null && _preloadedController!.value.isInitialized) {
      // Seamless swap: use preloaded controller
      _activeController = _preloadedController;
      _preloadedController = null;

      if (mounted) setState(() {});
      _activeController!.play();
      _activeController!.setLooping(false);
      _startPlaybackMonitoring();

      // Dispose old controller after frame
      WidgetsBinding.instance.addPostFrameCallback((_) {
        oldController?.dispose();
      });

      // Preload the one after next
      _preloadNextAd();
    } else {
      // Dispose old and init fresh
      WidgetsBinding.instance.addPostFrameCallback((_) {
        oldController?.dispose();
      });
      _playCurrentAd();
    }
  }

  Future<void> _loadFrequenciesAndTimestamps() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final freqStr = prefs.getString('ad_frequencies_map');
      if (freqStr != null) {
        final decoded = jsonDecode(freqStr) as Map<String, dynamic>;
        _adFrequencies = decoded.map((k, v) => MapEntry(k, v as int));
      }
      final timesStr = prefs.getString('ad_last_played_times');
      if (timesStr != null) {
        final decoded = jsonDecode(timesStr) as Map<String, dynamic>;
        _lastPlayedTimes = decoded.map((k, v) => MapEntry(k, v as int));
      }
    } catch (e) {
      print('Error loading ad schedules: $e');
    }
  }

  Future<void> _saveLastPlayedTimes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('ad_last_played_times', jsonEncode(_lastPlayedTimes));
    } catch (e) {
      print('Error saving last played times: $e');
    }
  }

  String _getBookingId(String path) {
    if (path.startsWith('static__')) {
      final parts = path.split('__');
      if (parts.length >= 2) return parts[1];
    } else {
      final fileName = path.split('/').last.split('\\').last;
      if (fileName.startsWith('ad_')) {
        return fileName.replaceAll('ad_', '').split('.').first;
      }
    }
    return '';
  }

  List<String> _getEligiblePlaylist(List<String> master) {
    if (master.isEmpty) return [];
    final now = DateTime.now().millisecondsSinceEpoch;
    final eligible = <String>[];
    for (final path in master) {
      final bookingId = _getBookingId(path);
      if (bookingId.isEmpty) {
        eligible.add(path);
        continue;
      }
      final freqMin = _adFrequencies[bookingId] ?? 0;
      if (freqMin == 0) {
        eligible.add(path);
        continue;
      }
      int bufferMin = 5;
      if (freqMin <= 30) {
        bufferMin = 3;
      } else if (freqMin > 120) {
        bufferMin = 15;
      }
      final cooldownMs = (freqMin - bufferMin) * 60 * 1000;
      final lastPlayed = _lastPlayedTimes[bookingId] ?? 0;
      if (now - lastPlayed >= cooldownMs) {
        eligible.add(path);
      }
    }
    // Fallback: if all ads are blocked by cooldowns, check if we have any continuous loop ads
    // in the master list. If there are no continuous loop ads at all, we bypass the filter
    // so the hourly ads loop continuously. If continuous ads do exist, we return empty/standby.
    if (eligible.isEmpty) {
      bool hasContinuous = false;
      for (final path in master) {
        final bookingId = _getBookingId(path);
        final freqMin = _adFrequencies[bookingId] ?? 0;
        if (freqMin == 0) {
          hasContinuous = true;
          break;
        }
      }
      if (!hasContinuous) {
        print('[SCHEDULER] All hourly ads on cooldown and no continuous loop ads exist. Bypassing filter.');
        return List.from(master);
      }
      print('[SCHEDULER] All eligible ads on cooldown. Transitioning to standby screen.');
      return [];
    }
    return eligible;
  }

  void _rebuildAndApplyPlaylist() {
    final eligible = _getEligiblePlaylist(_masterAdPlaylist);
    setState(() {
      _localPlaylist = eligible;
    });
    if (eligible.isEmpty) {
      // Stop playback and go to standby state
      _stopPlaybackMonitoring();
      _disposeActiveController();
      _preloadedController?.dispose();
      _preloadedController = null;
      setState(() {
        _playerState = PlayerState.waiting;
        _statusMessage = 'Standby. Waiting for scheduled ad slot...';
      });
    } else {
      // Re-preload the next ad in case it changed
      _preloadedController?.dispose();
      _preloadedController = null;
      _preloadNextAd();
    }
  }

  // =====================================================================
  // TELEMETRY
  // =====================================================================
  void _trackImpression(String adSource) {
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

    if (bookingId != 'unknown' && bookingId.isNotEmpty) {
      _lastPlayedTimes[bookingId] = DateTime.now().millisecondsSinceEpoch;
      _saveLastPlayedTimes();
      _rebuildAndApplyPlaylist();
    }

    // Fire-and-forget telemetry
    try {
      final req = AdImpressionRequest()
        ..deviceId = widget.deviceId
        ..bookingId = bookingId
        ..durationSeconds = 15
        ..interactiveClicks = 0;
      _deviceClient.trackAdImpression(req, options: _callOptions).ignore();
    } catch (e) {
      // Ignore telemetry errors
    }
  }

  // =====================================================================
  // CONTROLLER DISPOSAL HELPERS
  // =====================================================================
  void _disposeActiveController() {
    _activeController?.dispose();
    _activeController = null;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    // Re-enforce immersive mode when app resumes
    if (state == AppLifecycleState.resumed) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      // If playback stopped somehow, restart it
      if (_playerState == PlayerState.playing &&
          _activeController == null &&
          _localPlaylist.isNotEmpty) {
        print('[LIFECYCLE] App resumed, restarting playback...');
        _playCurrentAd();
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    _syncTimer?.cancel();
    _stopPlaybackMonitoring();
    _activeController?.dispose();
    _preloadedController?.dispose();
    _channel.shutdown();
    super.dispose();
  }

  // =====================================================================
  // BUILD UI
  // =====================================================================
  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Main content based on state
          _buildMainContent(),

          // QR Code Overlay (only when playing a real ad)
          if (_playerState == PlayerState.playing) _buildQrOverlay(),

          // Download progress overlay
          if (_downloadProgress.isNotEmpty) _buildDownloadOverlay(),

          // Hidden settings button
          _buildSettingsButton(),
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    switch (_playerState) {
      case PlayerState.booting:
        return _buildSplashScreen('Initializing...');

      case PlayerState.waiting:
        return _buildWaitingScreen();

      case PlayerState.playing:
        return _buildPlayerView();
    }
  }

  Widget _buildSplashScreen(String message) {
    return Container(
      color: const Color(0xFF030712),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.tv, size: 80, color: Colors.indigoAccent),
            const SizedBox(height: 24),
            const Text(
              'AIBot Ink',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 32),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaitingScreen() {
    return Container(
      color: const Color(0xFF030712),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_find, size: 80, color: Colors.indigoAccent),
            const SizedBox(height: 24),
            const Text(
              'AIBot Ink Display',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Device: ${widget.deviceId}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), letterSpacing: 1),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _statusMessage,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            TextButton.icon(
              onPressed: () {
                _syncRetryCount = 0;
                _attemptSync();
              },
              icon: const Icon(Icons.refresh, color: Colors.indigoAccent, size: 18),
              label: const Text(
                'Retry Now',
                style: TextStyle(color: Colors.indigoAccent, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerView() {
    if (_localPlaylist.isEmpty) return _buildSplashScreen('Loading...');

    final adSource = _localPlaylist[_currentAdIndex % _localPlaylist.length];
    final hasVideo = !adSource.startsWith('static__');
    final isReady = _activeController != null && _activeController!.value.isInitialized;

    if (hasVideo && isReady) {
      // Full-screen video player
      return FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: _activeController!.value.size.width,
          height: _activeController!.value.size.height,
          child: VideoPlayer(_activeController!),
        ),
      );
    } else if (!hasVideo) {
      // Static ad card
      String title = 'DigiAds Display';
      String subtitle = '';
      if (adSource.startsWith('static__')) {
        final parts = adSource.split('__');
        if (parts.length >= 4) {
          title = parts[2];
          subtitle = parts[3];
        }
      }

      return Container(
        color: const Color(0xFF030712),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.video_library, size: 100, color: Colors.indigoAccent),
              const SizedBox(height: 24),
              Text(
                'CMS DISPLAY DEVICE: ${widget.deviceId}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.indigo,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 16, color: Color(0xFF94A3B8)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    } else {
      // Video loading state (brief moment while controller initializes)
      return Container(
        color: Colors.black,
        child: const Center(
          child: CircularProgressIndicator(color: Colors.indigoAccent),
        ),
      );
    }
  }

  Widget _buildQrOverlay() {
    final adSource = _localPlaylist.isNotEmpty
        ? _localPlaylist[_currentAdIndex % _localPlaylist.length]
        : '';

    String bookingId = 'unknown';
    if (adSource.startsWith('static__')) {
      final parts = adSource.split('__');
      if (parts.length >= 2) bookingId = parts[1];
    } else if (adSource.isNotEmpty) {
      final fileName = adSource.split('/').last.split('\\').last;
      if (fileName.startsWith('ad_')) {
        bookingId = fileName.replaceAll('ad_', '').split('.').first;
      }
    }

    return Positioned(
      bottom: 30,
      right: 30,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(color: Colors.black45, blurRadius: 15, offset: Offset(0, 5)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 100,
              height: 100,
              child: QrImageView(
                data: 'http://${widget.serverHost}:4200/ad/$bookingId',
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDownloadOverlay() {
    return Positioned(
      bottom: 30,
      left: 30,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black87,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.indigoAccent.withOpacity(0.5)),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
            ),
            const SizedBox(width: 10),
            Text(
              _downloadProgress,
              style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsButton() {
    return Positioned(
      top: 30,
      right: 30,
      child: IconButton(
        icon: const Icon(Icons.settings, color: Colors.white10),
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text("Reset Device Screen?"),
              content: const Text("This will return the screen display to setup mode."),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Cancel"),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    widget.onReset();
                  },
                  child: const Text("Reset"),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
