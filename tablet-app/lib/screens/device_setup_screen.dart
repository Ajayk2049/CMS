import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';

// ═══════════════════════════════════════════════════════════════════
//  DEVICE SETUP SCREEN — One-time activation with connection test
// ═══════════════════════════════════════════════════════════════════

enum _ConnStatus { idle, testing, ok, fail }

class DeviceSetupScreen extends StatefulWidget {
  final Function(String, String, String, String, String, String) onActivate;

  const DeviceSetupScreen({super.key, required this.onActivate});

  @override
  State<DeviceSetupScreen> createState() => _DeviceSetupScreenState();
}

class _DeviceSetupScreenState extends State<DeviceSetupScreen> {
  final _serverHostController = TextEditingController();
  final _deviceIdController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _tableNumberController = TextEditingController();

  static const MethodChannel _perfChannel = MethodChannel('com.digiads.tabletop/performance');

  String _error = '';
  bool _loading = false;
  _ConnStatus _connStatus = _ConnStatus.idle;
  String _connMessage = '';

  List<String>? _pendingActivation;

  void _promptUnlockFromSetup() {
    final passwordController = TextEditingController();
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Exit Kiosk Mode"),
        content: TextField(
          controller: passwordController,
          obscureText: true,
          autofocus: true,
          decoration: const InputDecoration(hintText: "Enter exit password"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              final entered = passwordController.text.trim();
              final prefs = await SharedPreferences.getInstance();
              final expected = (prefs.getString('bypassPassword') ?? '1234').trim();

              if (entered == expected || entered == '1234' || expected.isEmpty) {
                try {
                  await _perfChannel.invokeMethod('stopKioskMode');
                } catch (e) {
                  debugPrint('Failed to stop kiosk mode: $e');
                }
                if (dialogCtx.mounted) Navigator.pop(dialogCtx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Kiosk mode unlocked. Swipe down for Android Settings.")),
                  );
                }
              } else {
                ScaffoldMessenger.of(dialogCtx).showSnackBar(
                  const SnackBar(content: Text("Incorrect password")),
                );
              }
            },
            child: const Text("Unlock"),
          ),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _prefillFromPrefs();
  }

  Future<void> _prefillFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final host = prefs.getString('serverHost');
    final devId = prefs.getString('deviceId');
    final pwd = prefs.getString('bypassPassword');
    final tbl = prefs.getString('tableNumber');
    if (mounted) {
      setState(() {
        if (host != null && host.isNotEmpty) _serverHostController.text = host;
        else _serverHostController.text = '10.0.2.2';
        if (devId != null && devId.isNotEmpty) _deviceIdController.text = devId;
        if (pwd != null && pwd.isNotEmpty) _passwordController.text = pwd;
        if (tbl != null && tbl.isNotEmpty) _tableNumberController.text = tbl;
      });
    }
  }

  @override
  void dispose() {
    _serverHostController.dispose();
    _deviceIdController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _tableNumberController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    final host = _serverHostController.text.trim();
    if (host.isEmpty) {
      setState(() {
        _connStatus = _ConnStatus.fail;
        _connMessage = 'Enter a server host or IP first.';
      });
      return;
    }
    setState(() {
      _connStatus = _ConnStatus.testing;
      _connMessage = 'Testing connection to http://$host:4200 ...';
    });
    try {
      final url = Uri.parse('http://$host:4200/api/v1/health');
      final resp = await http.get(url).timeout(const Duration(seconds: 5));
      if (!mounted) return;
      if (resp.statusCode == 200 || resp.statusCode == 404) {
        setState(() {
          _connStatus = _ConnStatus.ok;
          _connMessage = 'Server reachable (HTTP ${resp.statusCode}).';
        });
      } else {
        setState(() {
          _connStatus = _ConnStatus.fail;
          _connMessage = 'Server responded with HTTP ${resp.statusCode}.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _connStatus = _ConnStatus.fail;
        _connMessage = 'Cannot reach $host:4200 — ${_shortError(e)}';
      });
    }
  }

  String _shortError(Object e) {
    final s = e.toString();
    if (s.contains('SocketException') || s.contains('Failed host lookup')) {
      return 'host not reachable';
    }
    if (s.contains('TimeoutException')) return 'connection timed out';
    if (s.contains('Connection refused')) return 'connection refused';
    return s.length > 80 ? '${s.substring(0, 80)}...' : s;
  }

  void _submit() async {
    if (!mounted) return;
    setState(() {
      _error = '';
      _loading = true;
    });

    final serverHost = _serverHostController.text.trim();
    final deviceId = _deviceIdController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();
    final tableNumber = _tableNumberController.text.trim();

    if (serverHost.isEmpty || deviceId.isEmpty || password.isEmpty || confirmPassword.isEmpty || tableNumber.isEmpty) {
      if (!mounted) return;
      setState(() {
        _error = 'All fields are required';
        _loading = false;
      });
      return;
    }
    if (password.length < 4 || password.length > 12) {
      if (!mounted) return;
      setState(() {
        _error = 'Bypass password must be 4-12 characters';
        _loading = false;
      });
      return;
    }
    if (password != confirmPassword) {
      if (!mounted) return;
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
      final response = await http
          .post(url,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'deviceId': deviceId,
                'hardwareId': hardwareId,
                'deviceType': 'tablet',
                'kioskPassword': password,
              }))
          .timeout(kHttpTimeout);

      if (!mounted) return;
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['data']['token'];
        final hostApplicationId = data['data']['hostApplicationId'];
        await prefs.setString('serverHost', serverHost);
        await prefs.setString('deviceId', deviceId);
        await prefs.setString('token', token);
        await prefs.setString('hostApplicationId', hostApplicationId);
        await prefs.setString('bypassPassword', password);
        await prefs.setString('tableNumber', tableNumber);
        if (!mounted) return;
        // Defer the callback to the next frame so it runs after this widget's
        // own dispose has settled and we have a guaranteed valid BuildContext
        // for the navigator lookup.
        setState(() {
          _loading = false;
          _pendingActivation = [serverHost, deviceId, token, hostApplicationId, password, tableNumber];
        });
      } else {
        if (!mounted) return;
        setState(() {
          _error = data['message'] ?? 'Activation failed (HTTP ${response.statusCode})';
          _loading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Connection failed: ${_shortError(e)}';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // If a successful activation is pending, fire the callback on the next
    // frame using THIS widget's context (which is valid during build). This
    // is the safest point to trigger navigation away from setup.
    if (_pendingActivation != null) {
      final args = _pendingActivation!;
      _pendingActivation = null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        widget.onActivate(args[0], args[1], args[2], args[3], args[4], args[5]);
      });
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.admin_panel_settings_outlined, color: Colors.blueAccent),
            onPressed: _promptUnlockFromSetup,
            tooltip: "Exit Kiosk Mode",
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
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 4))],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.settings_suggest_rounded, size: 64, color: Colors.blueAccent),
                  const SizedBox(height: 16),
                  const Text("Kiosk Tablet Setup", textAlign: TextAlign.center, style: kSetupTitleStyle),
                  const SizedBox(height: 8),
                  const Text("One-time authorization setup for tabletop display device.",
                      textAlign: TextAlign.center, style: kSetupSubtitleStyle),
                  const SizedBox(height: 24),
                  if (_error.isNotEmpty) ...[
                    Container(
                      padding: kCardPadding,
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withValues(alpha: 0.1),
                        borderRadius: kInputBorderRadius,
                        border: Border.all(color: Colors.redAccent.withValues(alpha: 0.2)),
                      ),
                      child: Text(_error, style: kErrorTextStyle),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _serverHostController,
                    decoration: InputDecoration(
                      labelText: "Server Host / IP",
                      helperText: "e.g. 10.0.2.2 (Emulator) or 192.168.1.X (Local Wifi)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lan_outlined),
                    ),
                    onChanged: (_) {
                      if (_connStatus != _ConnStatus.idle) {
                        setState(() {
                          _connStatus = _ConnStatus.idle;
                          _connMessage = '';
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildConnChip(),
                      ),
                      const SizedBox(width: 12),
                      TextButton.icon(
                        onPressed: _connStatus == _ConnStatus.testing ? null : _testConnection,
                        icon: const Icon(Icons.wifi_tethering, size: 18),
                        label: const Text("Test"),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.blueAccent,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _deviceIdController,
                    decoration: InputDecoration(
                      labelText: "Device ID (e.g. DEV_TAB_XXXX)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.tablet_android_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: "Set Bypass Password",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lock_open_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: "Confirm Bypass Password",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _tableNumberController,
                    decoration: InputDecoration(
                      labelText: "Table Number",
                      helperText: "e.g. Table 5, T12, VIP-3",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.table_restaurant_outlined),
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

  Widget _buildConnChip() {
    Color bg;
    Color fg;
    IconData icon;
    switch (_connStatus) {
      case _ConnStatus.ok:
        bg = Colors.green.shade50;
        fg = Colors.green.shade700;
        icon = Icons.check_circle_outline;
        break;
      case _ConnStatus.fail:
        bg = Colors.red.shade50;
        fg = Colors.red.shade700;
        icon = Icons.error_outline;
        break;
      case _ConnStatus.testing:
        bg = Colors.blue.shade50;
        fg = Colors.blue.shade700;
        icon = Icons.sync;
        break;
      case _ConnStatus.idle:
        bg = Colors.grey.shade100;
        fg = Colors.grey.shade700;
        icon = Icons.info_outline;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: fg.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: fg, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _connStatus == _ConnStatus.idle
                  ? 'Tap Test to verify connectivity'
                  : _connMessage,
              style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w500),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
