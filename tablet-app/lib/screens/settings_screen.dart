import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';
import 'device_setup_screen.dart';
import 'download_progress_screen.dart';

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS SCREEN
//
//  Reached via the unlock dialog in kiosk mode. This is the ONLY
//  place from which navigation back to setup / download progress
//  is allowed — the kiosk never exposes these directly.
// ═══════════════════════════════════════════════════════════════════

class SettingsScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final String tableNumber;
  final VoidCallback onBackToKiosk;

  const SettingsScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.tableNumber,
    required this.onBackToKiosk,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  Future<void> _resetDevice() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Text('Reset device?'),
        content: const Text(
          'This will clear all saved credentials. You will need to run setup again before the kiosk can connect to a server.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('serverHost');
    await prefs.remove('deviceId');
    await prefs.remove('hostApplicationId');
    await prefs.remove('bypassPassword');
    await prefs.remove('tableNumber');
    await prefs.remove('cachedMenu');
    await prefs.remove('local_playlist');
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => DeviceSetupScreen(onActivate: _activate)),
    );
  }

  void _activate(String host, String dId, String tok, String hAppId, String pass, String tbl) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => DownloadProgressScreen(
          serverHost: host,
          deviceId: dId,
          token: tok,
          hostApplicationId: hAppId,
          bypassPassword: pass,
          tableNumber: tbl,
        ),
      ),
    );
  }

  void _reRunSetup() async {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => DeviceSetupScreen(onActivate: _activate)),
    );
  }

  void _reDownloadContent() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => DownloadProgressScreen(
          serverHost: widget.serverHost,
          deviceId: widget.deviceId,
          token: widget.token,
          hostApplicationId: widget.hostApplicationId,
          bypassPassword: widget.bypassPassword,
          tableNumber: widget.tableNumber,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kiosk Settings'),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBackToKiosk,
        ),
      ),
      backgroundColor: kScaffoldBg,
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildInfoCard(),
          const SizedBox(height: 20),
          _buildActionCard(
            icon: Icons.refresh_rounded,
            title: 'Re-download menu & ads',
            subtitle: 'Re-fetch from the server without changing credentials.',
            onTap: _reDownloadContent,
          ),
          _buildActionCard(
            icon: Icons.settings_remote_rounded,
            title: 'Re-run setup',
            subtitle: 'Change server, device ID or table number.',
            onTap: _reRunSetup,
          ),
          _buildActionCard(
            icon: Icons.lock_reset_rounded,
            title: 'Reset device',
            subtitle: 'Clear all credentials. Requires full setup before kiosk can run.',
            onTap: _resetDevice,
            danger: true,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () async {
              try {
                await const MethodChannel('com.digiads.tabletop/performance').invokeMethod('openAndroidSettings');
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to open Android Settings: $e')),
                  );
                }
              }
            },
            icon: const Icon(Icons.settings_applications_rounded, color: Colors.white),
            label: const Text(
              "System Settings",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: kCardBg,
        borderRadius: kCardBorderRadius,
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Device',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextGrey, letterSpacing: 1.2),
          ),
          const SizedBox(height: 6),
          _kv('Device ID', widget.deviceId),
          _kv('Server', widget.serverHost),
          _kv('Table', widget.tableNumber),
          _kv('Outlet ID', widget.hostApplicationId),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(k, style: const TextStyle(fontSize: 13, color: kTextGrey)),
          ),
          Expanded(
            child: Text(
              v.isEmpty ? '—' : v,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: kTextDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool danger = false,
  }) {
    final color = danger ? Colors.red.shade600 : Colors.blueAccent;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: kCardBg,
        borderRadius: kCardBorderRadius,
        child: InkWell(
          borderRadius: kCardBorderRadius,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: kCardBorderRadius,
              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kTextDark)),
                      const SizedBox(height: 2),
                      Text(subtitle, style: const TextStyle(fontSize: 12, color: kTextGrey)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: kTextGrey.withValues(alpha: 0.5)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
