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
      home: const KioskScreen(),
    );
  }
}

class KioskScreen extends StatefulWidget {
  const KioskScreen({super.key});

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
              // Mock Ad Video/Image
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.play_circle_fill, size: 80, color: Colors.blueAccent),
                      SizedBox(height: 20),
                      Text(
                        "SPONSORED ADVERTISEMENT",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.blue),
                      ),
                      SizedBox(height: 10),
                      Text(
                        "FitLife Gym Indiranagar - 30% Off",
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      Text(
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
              )
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text("Table 05 — Food Menu"),
        actions: [
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
          // Menu Grid
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

          // Order Checkout panel
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
