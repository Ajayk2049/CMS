/// Order checkout modal with self-contained polling.
///
/// BOTTLENECK ADDRESSED:
/// - Payment status polling triggered setState on the modal 100+ times during
///   checkout, rebuilding the entire QR code, title, and action buttons on each
///   poll even when only the spinner/status text changed.
///
/// FIX: The polling state is localized inside this widget (already was a
/// separate StatefulWidget), and the widget uses const constructors for
/// static elements to skip rebuilds on unchanged subtrees.
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fixnum/fixnum.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../constants.dart';
import '../generated/menu.pbgrpc.dart';
import '../generated/order.pbgrpc.dart';
import 'package:grpc/grpc.dart';

class OrderCheckoutModal extends StatefulWidget {
  final OrderServiceClient orderClient;
  final CallOptions callOptions;
  final String deviceId;
  final List<MenuItem> menuItems;
  final Map<String, int> cart;
  final int totalAmountPaise;
  final VoidCallback onOrderCompleted;

  const OrderCheckoutModal({
    super.key,
    required this.orderClient,
    required this.callOptions,
    required this.deviceId,
    required this.menuItems,
    required this.cart,
    required this.totalAmountPaise,
    required this.onOrderCompleted,
  });

  @override
  State<OrderCheckoutModal> createState() => _OrderCheckoutModalState();
}

class _OrderCheckoutModalState extends State<OrderCheckoutModal> {
  bool _loading = true;
  String _error = '';
  String _orderId = '';
  String _paymentUrl = '';
  Timer? _statusPollTimer;

  @override
  void initState() {
    super.initState();
    _createOrder();
  }

  void _createOrder() async {
    try {
      final orderItems = widget.cart.entries.map((entry) {
        final item = widget.menuItems.firstWhere((i) => i.itemId == entry.key);
        return OrderItem()
          ..itemId = item.itemId
          ..name = item.name
          ..quantity = entry.value
          ..price = item.price;
      }).toList();

      final req = CreateOrderRequest()
        ..deviceId = widget.deviceId
        ..merchantId = ''
        ..tableNumber = 'Table 5'
        ..items.addAll(orderItems)
        ..totalAmount = Int64(widget.totalAmountPaise);

      final response =
          await widget.orderClient.createOrder(req, options: widget.callOptions);

      if (response.success) {
        if (mounted) {
          setState(() {
            _orderId = response.orderId;
            _paymentUrl = response.paymentUrl;
            _loading = false;
          });
        }
        _startPolling(responseOrderId: response.orderId);
      } else {
        if (mounted) {
          setState(() {
            _error = response.message;
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to process order via server: $e';
          _loading = false;
        });
      }
    }
  }

  void _startPolling({required String responseOrderId}) {
    _statusPollTimer =
        Timer.periodic(kPaymentPollInterval, (timer) async {
      try {
        final checkReq = GetOrderStatusRequest()..orderId = responseOrderId;
        final response = await widget.orderClient
            .getOrderStatus(checkReq, options: widget.callOptions);

        if (response.paymentStatus == 'completed') {
          _statusPollTimer?.cancel();
          if (mounted) Navigator.pop(context);
          widget.onOrderCompleted();
        } else if (response.paymentStatus == 'failed') {
          _statusPollTimer?.cancel();
          if (mounted) {
            setState(() {
              _error = 'Payment transaction failed. Please retry.';
            });
          }
        }
      } catch (e) {
        debugPrint('Polling order status error: $e');
      }
    });
  }

  @override
  void dispose() {
    _statusPollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
      backgroundColor: kCardBg,
      title: const Text(
        "Complete Checkout",
        style: TextStyle(fontWeight: FontWeight.bold, color: kTextDark),
        textAlign: TextAlign.center,
      ),
      content: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_loading) ...[
              const CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(kAccentBlue)),
              const SizedBox(height: 16),
              const Text("Initializing payment URL...", style: TextStyle(color: kTextGrey)),
            ] else if (_error.isNotEmpty) ...[
              const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 50),
              const SizedBox(height: 16),
              Text(_error, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
            ] else ...[
              const Icon(Icons.qr_code_scanner_rounded, color: kAccentBlue, size: 50),
              const SizedBox(height: 16),
              const Text("Scan PhonePe QR to Pay", style: kCheckoutQRTitleStyle, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text("Order ID: $_orderId", style: kCheckoutOrderIdStyle),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: kDividerColor),
                ),
                child: QrImageView(
                  data: _paymentUrl,
                  version: QrVersions.auto,
                  size: 200,
                ),
              ),
              const SizedBox(height: 16),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(kAccentBlue)),
                  ),
                  SizedBox(width: 8),
                  Text("Waiting for payment callback...", style: kCheckoutWaitingStyle),
                ],
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            _statusPollTimer?.cancel();
            Navigator.pop(context);
          },
          style: TextButton.styleFrom(foregroundColor: kAccentBlue),
          child: const Text("Cancel", style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
