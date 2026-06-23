import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:grpc/grpc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:video_player/video_player.dart';

import 'generated/device.pbgrpc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
      title: 'Landscape Ad Screen',
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

    final serverHost = _serverHostController.text.trim();
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
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF020617), Color(0xFF1E1B4B)],
            begin: Alignment.bottomLeft,
            end: Alignment.topRight,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              width: 420,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
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

class _AdPlayerScreenState extends State<AdPlayerScreen> {
  late ClientChannel _channel;
  late DeviceServiceClient _deviceClient;
  late CallOptions _callOptions;
  Timer? _heartbeatTimer;

  // Ads state
  List<Map<String, dynamic>> _adCampaigns = [];
  int _currentAdIndex = 0;
  Timer? _adRotateTimer;
  VideoPlayerController? _videoPlayerController;
  bool _adLoading = false;
  bool _grpcConnected = false;

  @override
  void initState() {
    super.initState();
    _initGrpc();
    _registerAndStartHeartbeat();
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

    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: const Duration(seconds: 10),
    );
  }

  void _registerAndStartHeartbeat() async {
    try {
      final req = RegisterDeviceRequest()
        ..deviceId = widget.deviceId
        ..deviceType = 'screen'
        ..hostApplicationId = widget.hostApplicationId;

      await _deviceClient.registerDevice(req, options: _callOptions);
      if (mounted) {
        setState(() {
          _grpcConnected = true;
        });
      }
      print('gRPC Screen registered successfully');
    } catch (e) {
      print('gRPC Screen registration failed: $e');
    }

    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      try {
        await _deviceClient.sendHeartbeat(HeartbeatRequest()..deviceId = widget.deviceId, options: _callOptions);
        if (mounted && !_grpcConnected) {
          setState(() {
            _grpcConnected = true;
          });
        }
      } catch (e) {
        print('gRPC Heartbeat failed: $e');
        if (mounted && _grpcConnected) {
          setState(() {
            _grpcConnected = false;
          });
        }
      }
    });
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
        'title': 'Aibot Ink Digital Solutions',
        'subtitle': 'Manage all your retail wall display screens seamlessly.'
      },
      {
        'bookingId': 'B_FALLBACK_2',
        'mediaUrl': '',
        'title': 'Spring Fit Campaign Ad',
        'subtitle': 'Refresh your health this season. Scan the QR code.'
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

    // Log Ad impression telemetry via gRPC
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

      // Safety timeout
      _adRotateTimer = Timer(const Duration(seconds: 18), _nextAd);
    } else {
      // Static Ad
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

  @override
  Widget build(BuildContext context) {
    final ad = _adCampaigns.isNotEmpty ? _adCampaigns[_currentAdIndex] : null;
    final mediaUrl = ad != null ? (ad['mediaUrl'] as String? ?? '') : '';
    final title = ad != null ? (ad['title'] as String? ?? '') : 'DigiAds Display';
    final subtitle = ad != null ? (ad['subtitle'] as String? ?? ad['description'] ?? '') : '';

    final hasVideo = mediaUrl.isNotEmpty && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'));
    final isVideoInitialized = _videoPlayerController != null && _videoPlayerController!.value.isInitialized;

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background Ad video/placeholder
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
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF020617), Color(0xFF1E1B4B)],
                  begin: Alignment.bottomLeft,
                  end: Alignment.topRight,
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.video_library, size: 100, color: Colors.indigoAccent),
                    const SizedBox(height: 24),
                    Text(
                      "CMS DISPLAY DEVICE: ${widget.deviceId}",
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
            ),
            
          // QR Code Overlay bottom right
          Positioned(
            bottom: 30,
            right: 30,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black45,
                    blurRadius: 15,
                    offset: Offset(0, 5),
                  )
                ]
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: QrImageView(
                      data: mediaUrl.isNotEmpty ? mediaUrl : 'http://${widget.serverHost}:4200/ad/${ad?['bookingId']}',
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
          ),
          
          // Online Status indicator top left
          Positioned(
            top: 30,
            left: 30,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: _grpcConnected ? const Color(0xFF10B981).withOpacity(0.15) : Colors.red.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _grpcConnected ? const Color(0xFF10B981).withOpacity(0.3) : Colors.red.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  CircleAvatar(radius: 4, backgroundColor: _grpcConnected ? const Color(0xFF10B981) : Colors.red),
                  const SizedBox(width: 8),
                  Text(
                    _grpcConnected ? "ONLINE (gRPC Connected)" : "OFFLINE (Connecting...)",
                    style: TextStyle(fontSize: 10, color: _grpcConnected ? const Color(0xFF10B981) : Colors.red, fontWeight: FontWeight.bold),
                  )
                ],
              ),
            ),
          ),
          
          // Hidden Unlock Button (Top Right) for resetting/reconfiguring the display
          Positioned(
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
                      TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          widget.onReset();
                        },
                        child: const Text("Reset"),
                      )
                    ],
                  ),
                );
              },
            ),
          )
        ],
      ),
    );
  }
}
