import 'package:flutter/material';

void main() {
  runApp(const TabletopOrderingApp());
}

class TabletopOrderingApp extends StatelessWidget {
  const TabletopOrderingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tabletop Ordering Kiosk',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.blue,
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
  String _bypassPassword = '';

  void _activate(String deviceId, String password) {
    setState(() {
      _deviceId = deviceId;
      _bypassPassword = password;
      _isActivated = true;
    });
  }

  void _deactivate() {
    setState(() {
      _isActivated = false;
      _deviceId = '';
      _bypassPassword = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isActivated) {
      return DeviceSetupScreen(onActivate: _activate);
    }
    return KioskScreen(
      deviceId: _deviceId,
      bypassPassword: _bypassPassword,
      onReset: _deactivate,
    );
  }
}

class DeviceSetupScreen extends StatefulWidget {
  final Function(String, String) onActivate;
  const DeviceSetupScreen({super.key, required this.onActivate});

  @override
  State<DeviceSetupScreen> createState() => _DeviceSetupScreenState();
}

class _DeviceSetupScreenState extends State<DeviceSetupScreen> {
  final _deviceIdController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String _error = '';

  void _submit() {
    setState(() => _error = '');
    final deviceId = _deviceIdController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (deviceId.isEmpty || password.isEmpty || confirmPassword.isEmpty) {
      setState(() => _error = 'All fields are required');
      return;
    }

    if (password.length < 4 || password.length > 12) {
      setState(() => _error = 'Bypass password must be 4-12 characters');
      return;
    }

    if (password != confirmPassword) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    widget.onActivate(deviceId, password);
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
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Authorize & Bind Device", style: TextStyle(fontWeight: FontWeight.bold)),
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
  final String deviceId;
  final String bypassPassword;
  final VoidCallback onReset;

  const KioskScreen({
    super.key,
    required this.deviceId,
    required this.bypassPassword,
    required this.onReset,
  });

  @override
  State<KioskScreen> createState() => _KioskScreenState();
}

class _KioskScreenState extends State<KioskScreen> {
  bool _isIdle = true;
  final List<String> _cart = [];
  final List<Map<String, dynamic>> _menu = [
    {"id": "item1", "name": "Pepperoni Pizza Grande", "price": 449, "desc": "Extra cheese, fresh basil"},
    {"id": "item2", "name": "Crispy French Fries", "price": 229, "desc": "With parmesan & garlic mayo"},
    {"id": "item3", "name": "Cheeseburger Deluxe", "price": 299, "desc": "Flame grilled beef, brioche bun"},
    {"id": "item4", "name": "Iced Hazelnut Latte", "price": 179, "desc": "Fresh espresso, cold foam"}
  ];

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
                        style: const TextStyle(fontSize: 12, color: Colors.slate400, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        "SPONSORED ADVERTISEMENT",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.blue),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        "FitLife Gym Indiranagar - 30% Off",
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        "Scan screen overlay QR to claim voucher",
                        style: TextStyle(fontSize: 14, color: Colors.slate400),
                      ),
                    ],
                  ),
                ),
              ),
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
                    letterSpacing: 1.5,
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

    return Scaffold(
      appBar: AppBar(
        title: Text("${widget.deviceId} — Food Menu"),
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
            tooltip: "Return to idle ads",
          )
        ],
      ),
      body: Row(
        children: [
          Expanded(
            flex: 2,
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.1,
              ),
              itemCount: _menu.length,
              itemBuilder: (context, index) {
                final item = _menu[index];
                return Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item["name"], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            Text(item["desc"], style: const TextStyle(fontSize: 12, color: Colors.slate400), maxLines: 2),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            Text("₹${item["price"]}", style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.blueAccent)),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _cart.add(item["name"]);
                                });
                              },
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              child: const Text("Add"),
                            )
                          ],
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            width: 320,
            border: const Border(left: BorderSide(color: Colors.white10)),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Order Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                const SizedBox(height: 20),
                Expanded(
                  child: _cart.isEmpty
                      ? const Center(child: Text("Cart is empty", style: TextStyle(color: Colors.slate500)))
                      : ListView.builder(
                          itemCount: _cart.length,
                          itemBuilder: (context, index) {
                            return ListTile(
                              title: Text(_cart[index]),
                              trailing: IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                                onPressed: () {
                                  setState(() {
                                    _cart.removeAt(index);
                                  });
                                },
                              ),
                            );
                          },
                        ),
                ),
                if (_cart.isNotEmpty) ...[
                  const Divider(),
                  ElevatedButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text("Order Placed Successfully"),
                          content: const Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check_circle_outline, color: Colors.green, size: 60),
                              SizedBox(height: 16),
                              Text("Scan the QR code on screen to complete PhonePe payment"),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () {
                                Navigator.pop(context);
                                setState(() {
                                  _cart.clear();
                                  _isIdle = true;
                                });
                              },
                              child: const Text("Close"),
                            )
                          ],
                        ),
                      );
                    },
                    icon: const Icon(Icons.payment),
                    label: const Text("Confirm & Order"),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
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
}
