/// Order checkout modal — places order with table number, no payment.
library;

import 'package:flutter/material.dart';
import 'package:fixnum/fixnum.dart';
import '../constants.dart';
import '../generated/menu.pbgrpc.dart';
import '../generated/order.pbgrpc.dart';
import 'package:grpc/grpc.dart';

class OrderCheckoutModal extends StatefulWidget {
  final OrderServiceClient orderClient;
  final CallOptions callOptions;
  final String deviceId;
  final String tableNumber;
  final List<MenuItem> menuItems;
  final Map<String, int> cart;
  final int totalAmountPaise;
  final VoidCallback onOrderCompleted;

  const OrderCheckoutModal({
    super.key,
    required this.orderClient,
    required this.callOptions,
    required this.deviceId,
    required this.tableNumber,
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
        ..tableNumber = widget.tableNumber
        ..items.addAll(orderItems)
        ..totalAmount = Int64(widget.totalAmountPaise);

      final response =
          await widget.orderClient.createOrder(req, options: widget.callOptions);

      if (response.success) {
        if (mounted) {
          setState(() {
            _orderId = response.orderId;
            _loading = false;
          });
        }
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
          _error = 'Failed to place order: $e';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
      backgroundColor: kCardBg,
      title: Text(
        _loading ? "Placing Order..." : (_error.isNotEmpty ? "Order Failed" : "Order Placed!"),
        style: const TextStyle(fontWeight: FontWeight.bold, color: kTextDark),
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
              const Text("Sending order to kitchen...", style: TextStyle(color: kTextGrey)),
            ] else if (_error.isNotEmpty) ...[
              const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 50),
              const SizedBox(height: 16),
              Text(_error, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
            ] else ...[
              const Icon(Icons.check_circle_outline_rounded, color: Colors.green, size: 60),
              const SizedBox(height: 16),
              Text(
                "Order #$_orderId",
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: kTextDark),
              ),
              const SizedBox(height: 8),
              Text(
                "${widget.tableNumber} • ${widget.cart.length} items",
                style: const TextStyle(fontSize: 14, color: kTextGrey),
              ),
              const SizedBox(height: 16),
              const Text(
                "Your order has been sent to the kitchen.",
                style: TextStyle(color: kTextGrey),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _loading
              ? null
              : () {
                  Navigator.pop(context);
                  if (_error.isEmpty) {
                    widget.onOrderCompleted();
                  }
                },
          style: TextButton.styleFrom(foregroundColor: kAccentBlue),
          child: Text(
            _loading ? "Cancel" : (_error.isNotEmpty ? "Close" : "Done"),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }
}
