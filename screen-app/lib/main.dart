import 'package:flutter/material';

void main() {
  runApp(const LandscapeAdScreenApp());
}

class LandscapeAdScreenApp extends StatelessWidget {
  const LandscapeAdScreenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Landscape Ad Screen',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.indigo,
        useMaterial3: true,
      ),
      home: const MainDeviceRouter(),
    );
  }
}

class MainDeviceRouter extends StatefulWidget {
  const MainDeviceRouter({super.key});

  @override
  State<MainDeviceRouter> createState() => _MainDeviceRouterState();
}

class _MainDeviceRouterState extends State<MainDeviceRouter> {
  bool _isActivated = false;
  String _deviceId = '';

  void _activate(String deviceId) {
    setState(() {
      _deviceId = deviceId;
      _isActivated = true;
    });
  }

  void _deactivate() {
    setState(() {
      _isActivated = false;
      _deviceId = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isActivated) {
      return ScreenSetupScreen(onActivate: _activate);
    }
    return AdPlayerScreen(
      deviceId: _deviceId,
      onReset: _deactivate,
    );
  }
}

class ScreenSetupScreen extends StatefulWidget {
  final Function(String) onActivate;
  const ScreenSetupScreen({super.key, required this.onActivate});

  @override
  State<ScreenSetupScreen> createState() => _ScreenSetupScreenState();
}

class _ScreenSetupScreenState extends State<ScreenSetupScreen> {
  final _deviceIdController = TextEditingController();
  String _error = '';

  void _submit() {
    setState(() => _error = '');
    final deviceId = _deviceIdController.text.trim();

    if (deviceId.isEmpty) {
      setState(() => _error = 'Device ID is required');
      return;
    }

    widget.onActivate(deviceId);
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
                    style: TextStyle(fontSize: 12, color: Colors.slate400),
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
                    controller: _deviceIdController,
                    decoration: InputDecoration(
                      labelText: "Device ID (e.g. DEV_SCR_XXXX)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.tv),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.indigoAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Authorize & Bind Screen", style: TextStyle(fontWeight: FontWeight.bold)),
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
  final String deviceId;
  final VoidCallback onReset;

  const AdPlayerScreen({
    super.key,
    required this.deviceId,
    required this.onReset,
  });

  @override
  State<AdPlayerScreen> createState() => _AdPlayerScreenState();
}

class _AdPlayerScreenState extends State<AdPlayerScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
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
                  const SizedBox(height: 8),
                  const Text(
                    "Playing: Spring Fit campaign ad...",
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const Text(
                    "Real-time gRPC stream active",
                    style: TextStyle(fontSize: 14, color: Colors.slate400),
                  ),
                ],
              ),
            ),
          ),
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
                  Container(
                    width: 100,
                    height: 100,
                    color: const Color(0xFF0F172A),
                    child: const Center(
                      child: Text(
                        "QR CODE\nOVERLAY",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
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
          Positioned(
            top: 30,
            left: 30,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.emerald.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.emerald.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  CircleAvatar(radius: 4, backgroundColor: Colors.emerald-400),
                  SizedBox(width: 8),
                  Text(
                    "ONLINE (gRPC Connected)",
                    style: TextStyle(fontSize: 10, color: Colors.emerald-400, fontWeight: FontWeight.bold),
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
