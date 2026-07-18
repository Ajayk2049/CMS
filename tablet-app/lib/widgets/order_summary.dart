import 'package:flutter/material.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../menu_image_cache.dart';
import 'package:fixnum/fixnum.dart';
import '../generated/menu.pbgrpc.dart';
import 'cached_menu_image.dart';

class OrderSummaryPanel extends StatelessWidget {
  final CartNotifier cartNotifier;
  final List<MenuItem> menuItems;
  final bool showHeader;
  final VoidCallback onPlaceOrder;
  final String serverHost;
  final MenuImageCache imageCache;

  const OrderSummaryPanel({
    super.key,
    required this.cartNotifier,
    required this.menuItems,
    required this.showHeader,
    required this.onPlaceOrder,
    required this.serverHost,
    required this.imageCache,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: cartNotifier,
      builder: (context, cart, _) {
        if (cart.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shopping_cart_outlined, size: 64, color: kTextGrey),
                SizedBox(height: 16),
                Text("Your cart is empty", style: kEmptyCartStyle),
              ],
            ),
          );
        }

        final total = cart.totalPrice(menuItems);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ListView.separated(
                itemCount: cart.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 16),
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

                  final unitPrice = item.price.toDouble() / 100.0;
                  final lineTotal = unitPrice * quantity;

                  return Container(
                    decoration: const BoxDecoration(
                      color: kCardBg,
                      borderRadius: kCardBorderRadius,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 6,
                          offset: Offset(0, 3),
                        )
                      ],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Food Image — local cache first, network fallback
                        ClipRRect(
                          borderRadius: kImageBorderRadius,
                          child: Container(
                            width: 90,
                            height: 90,
                            color: kScaffoldBg,
                            child: CachedMenuImage(
                              cache: imageCache,
                              itemId: item.itemId,
                              imageUrl: item.imageUrl,
                              serverHost: serverHost,
                              fallback: const Icon(Icons.restaurant_menu, color: kTextGrey),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Details Column
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                item.name,
                                style: kCardTitleStyle.copyWith(fontSize: 18),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Unit price: ₹${unitPrice.toStringAsFixed(2)}",
                                style: kCardDescriptionStyle.copyWith(fontSize: 13),
                              ),
                              const SizedBox(height: 12),
                              // Pill Qty Stepper
                              Container(
                                decoration: BoxDecoration(
                                  color: kScaffoldBg,
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: const EdgeInsets.all(8),
                                      icon: const Icon(Icons.remove, color: kAccentBlue, size: 18),
                                      onPressed: () => cartNotifier.removeItem(itemId),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '$quantity',
                                      style: kQuantityTextStyle.copyWith(color: kTextDark),
                                    ),
                                    const SizedBox(width: 8),
                                    IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: const EdgeInsets.all(8),
                                      icon: const Icon(Icons.add, color: kAccentBlue, size: 18),
                                      onPressed: () => cartNotifier.addItem(itemId),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Price & Trash
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              "Line total",
                              style: kCardDescriptionStyle,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "₹${lineTotal.toStringAsFixed(2)}",
                              style: kTotalValueStyle.copyWith(fontSize: 18),
                            ),
                            const SizedBox(height: 12),
                            // Trash Icon inside red-bordered circle
                            GestureDetector(
                              onTap: () {
                                // Remove all items of this type
                                for (int i = 0; i < quantity; i++) {
                                  cartNotifier.removeItem(itemId);
                                }
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.red.shade200, width: 1.5),
                                  color: Colors.red.shade50,
                                ),
                                padding: const EdgeInsets.all(8),
                                child: Icon(Icons.delete_outline_rounded, color: Colors.red.shade400, size: 20),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            // Calculations Card
            Container(
              decoration: const BoxDecoration(
                color: kCardBg,
                borderRadius: kCardBorderRadius,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 6,
                    offset: Offset(0, 3),
                  )
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Total", style: kTotalLabelStyle.copyWith(fontSize: 18)),
                      Text(
                        "₹${total.toStringAsFixed(2)}",
                        style: kTotalValueStyle.copyWith(fontSize: 24),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Proceed to Payment button
            SizedBox(
              height: 64,
              child: ElevatedButton(
                onPressed: onPlaceOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccentBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
                  elevation: 2,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(width: 24), // to center text somewhat
                    const Text(
                      "Place Order",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    Container(
                      decoration: const BoxDecoration(
                        color: Colors.white24,
                        shape: BoxShape.circle,
                      ),
                      padding: const EdgeInsets.all(8),
                      child: const Icon(Icons.arrow_forward, color: Colors.white, size: 20),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
