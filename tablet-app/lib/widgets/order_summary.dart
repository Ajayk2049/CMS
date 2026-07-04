/// Order summary panel — displays cart contents and checkout button.
///
/// BOTTLENECK ADDRESSED:
/// - Cart item quantity changes triggered root setState, rebuilding the entire
///   menu grid, video player, and app bar alongside the order summary.
///
/// FIX: This widget observes CartNotifier via ValueListenableBuilder. Only the
/// order summary list, total, and checkout button rebuild on cart changes.
library;

import 'package:flutter/material.dart';
import '../constants.dart';
import '../menu_state.dart';
import 'package:fixnum/fixnum.dart';
import '../generated/menu.pbgrpc.dart';

class OrderSummaryPanel extends StatelessWidget {
  final CartNotifier cartNotifier;
  final List<MenuItem> menuItems;
  final bool showHeader;
  final VoidCallback onPlaceOrder;

  const OrderSummaryPanel({
    super.key,
    required this.cartNotifier,
    required this.menuItems,
    required this.showHeader,
    required this.onPlaceOrder,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: cartNotifier,
      builder: (context, cart, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showHeader) ...[
              const Text("Order Summary", style: kOrderHeaderStyle),
              const SizedBox(height: 20),
            ],
            Expanded(
              child: cart.isEmpty
                  ? const Center(
                      child: Text("Cart is empty", style: kEmptyCartStyle))
                  : ListView.builder(
                      itemCount: cart.items.length,
                      itemBuilder: (context, index) {
                        final itemId = cart.items.keys.elementAt(index);
                        final quantity = cart.items[itemId]!;
                        final item = menuItems.firstWhere(
                          (i) => i.itemId == itemId,
                          orElse: () => MenuItem()
                            ..itemId = itemId
                            ..name = 'Unknown Item'
                            ..price = Int64(0),
                        );

                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(item.name, style: kOrderItemTitleStyle),
                          subtitle: Text(
                            "₹${(item.price.toDouble() / 100.0).toStringAsFixed(1)} x $quantity",
                            style: kOrderItemSubtitleStyle,
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.remove_circle_outline_rounded,
                                  color: Colors.blueAccent,
                                  size: 20,
                                ),
                                onPressed: () =>
                                    cartNotifier.removeItem(itemId),
                              ),
                              Text('$quantity',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold)),
                              IconButton(
                                icon: const Icon(
                                  Icons.add_circle_outline_rounded,
                                  color: Colors.blueAccent,
                                  size: 20,
                                ),
                                onPressed: () => cartNotifier.addItem(itemId),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            if (cart.isNotEmpty) ...[
              const Divider(),
              Padding(
                padding: kCheckoutTotalPadding,
                key: const ValueKey('checkout_summary'),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Total:", style: kTotalLabelStyle),
                    Text(
                      "₹${cart.totalPrice(menuItems).toStringAsFixed(2)}",
                      style: kTotalValueStyle,
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                onPressed: onPlaceOrder,
                icon: const Icon(Icons.qr_code_2_rounded),
                label: const Text("Confirm & Place Order",
                    style: kCheckoutTitleStyle),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: Colors.blueAccent,
                  foregroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(
                      borderRadius: kInputBorderRadius),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}
