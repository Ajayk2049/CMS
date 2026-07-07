import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';

// ═══════════════════════════════════════════════════════════════════
//  DEVICE SETUP SCREEN — One-time activation
// ═══════════════════════════════════════════════════════════════════

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
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
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
                  ),
                  const SizedBox(height: 16),
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
