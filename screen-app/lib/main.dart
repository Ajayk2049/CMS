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
      home: const AdPlayerScreen(),
    );
  }
}

class AdPlayerScreen extends StatefulWidget {
  const AdPlayerScreen({super.key});

  @override
  State<AdPlayerScreen> createState() => _AdPlayerScreenState();
}

class _AdPlayerScreenState extends State<AdPlayerScreen> {
  // Screen operates on 24/7 landscape mode, listening to heartbeats
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background Ad Loop simulation
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF020617), Color(0xFF1E1B4B)],
                begin: Alignment.bottomLeft,
                end: Alignment.topRight,
              ),
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.video_library, size: 100, color: Colors.indigoAccent),
                  SizedBox(height: 24),
                  Text(
                    "CMS DISPLAY DEVICE SCR_1002",
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.indigo,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    "Playing: Spring Fit campaign ad...",
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Real-time gRPC stream active",
                    style: TextStyle(fontSize: 14, color: Colors.slate-400),
                  ),
                ],
              ),
            ),
          ),

          // QR Code Overlay in the bottom right corner for customer interaction
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

          // Status Badge indicating online connection
          Positioned(
            top: 30,
            left: 30,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.emerald-500.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.emerald-500.withOpacity(0.3)),
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
          )
        ],
      ),
    );
  }
}
