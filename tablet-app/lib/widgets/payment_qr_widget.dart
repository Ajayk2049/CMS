/// Payment QR screen — shown when admin closes the table.
/// Displays a scannable QR code for UPI payment.
library;

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../constants.dart';

class PaymentQrWidget extends StatelessWidget {
  final String upiUrl;
  final int amountPaise;
  final String orderId;
  final String tableNumber;
  final VoidCallback? onUnlock;
  final List<dynamic>? items;
  final int? subtotalPaise;
  final int? gstPaise;
  final int? otherChargesPaise;

  const PaymentQrWidget({
    super.key,
    required this.upiUrl,
    required this.amountPaise,
    required this.orderId,
    required this.tableNumber,
    this.onUnlock,
    this.items,
    this.subtotalPaise,
    this.gstPaise,
    this.otherChargesPaise,
  });

  String get _amountFormatted => (amountPaise / 100).toStringAsFixed(2);

  Widget _buildBreakdownRow(String label, int amountPaise) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 13)),
          Text('₹${(amountPaise / 100).toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1B4B),
      body: Stack(
        children: [
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'SCAN TO PAY',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Table $tableNumber',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.white54,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 32),
                    if (items != null && items!.isNotEmpty) ...[
                      Container(
                        margin: const EdgeInsets.only(bottom: 24),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white10),
                        ),
                        width: 320,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'ORDER BREAKDOWN',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white70,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ...items!.map((item) {
                              if (item is! Map) return const SizedBox.shrink();
                              final name = item['name'] as String? ?? '';
                              final qty = item['quantity'] as int? ?? 1;
                              final pricePaise = item['price'] as int? ?? 0;
                              final itemTotal = (pricePaise * qty / 100).toStringAsFixed(2);
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '$name x$qty',
                                        style: const TextStyle(color: Colors.white, fontSize: 14),
                                      ),
                                    ),
                                    Text(
                                      '₹$itemTotal',
                                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                                    ),
                                  ],
                                ),
                              );
                            }),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8),
                              child: Divider(color: Colors.white10, height: 1),
                            ),
                            if (subtotalPaise != null && subtotalPaise! > 0)
                              _buildBreakdownRow('Subtotal', subtotalPaise!),
                            if (gstPaise != null && gstPaise! > 0)
                              _buildBreakdownRow('GST', gstPaise!),
                            if (otherChargesPaise != null && otherChargesPaise! > 0)
                              _buildBreakdownRow('Other Charges', otherChargesPaise!),
                          ],
                        ),
                      ),
                    ],
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          if (upiUrl.isNotEmpty)
                            QrImageView(
                              data: upiUrl,
                              version: QrVersions.auto,
                              size: 220,
                              backgroundColor: Colors.white,
                              eyeStyle: const QrEyeStyle(
                                color: Color(0xFF1E1B4B),
                                eyeShape: QrEyeShape.square,
                              ),
                              dataModuleStyle: const QrDataModuleStyle(
                                color: Color(0xFF1E1B4B),
                                dataModuleShape: QrDataModuleShape.square,
                              ),
                            )
                          else
                            const SizedBox(
                              width: 220,
                              height: 220,
                              child: Center(
                                child: Text(
                                  'Set up UPI ID\nin dashboard',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black38,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          const SizedBox(height: 20),
                          Text(
                            '₹$_amountFormatted',
                            style: const TextStyle(
                              fontSize: 42,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1E1B4B),
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            orderId,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.black38,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Text(
                        'Open any UPI app (GPay, PhonePe, Paytm)\nand scan this QR code to pay',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white60,
                          fontWeight: FontWeight.w500,
                          height: 1.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Waiting for payment confirmation...',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white30,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (onUnlock != null)
            Positioned(
              top: 40,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.admin_panel_settings_outlined,
                    color: Colors.white24),
                onPressed: onUnlock,
                tooltip: 'Exit Kiosk',
              ),
            ),
        ],
      ),
    );
  }
}
