import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../menu_image_cache.dart';
import '../generated/menu.pbgrpc.dart';
import 'cached_menu_image.dart';

class MenuCatalogWidget extends StatefulWidget {
  final MenuNotifier menuNotifier;
  final CartNotifier cartNotifier;
  final String serverHost;
  final double viewportHeight;
  final String selectedCategory;
  final MenuImageCache imageCache;
  final bool isOnline;

  const MenuCatalogWidget({
    super.key,
    required this.menuNotifier,
    required this.cartNotifier,
    required this.serverHost,
    required this.viewportHeight,
    required this.selectedCategory,
    required this.imageCache,
    this.isOnline = true,
  });

  @override
  State<MenuCatalogWidget> createState() => _MenuCatalogWidgetState();
}

class _MenuCatalogWidgetState extends State<MenuCatalogWidget> {
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MenuState>(
      valueListenable: widget.menuNotifier,
      builder: (context, menuState, _) {
        if (menuState.isLoading) {
          return const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(kAccentBlue),
            ),
          );
        }
        if (menuState.items.isEmpty) {
          return const Center(
            child: Text(
              "No menu items available.",
              style: TextStyle(color: kTextGrey, fontSize: 16, fontWeight: FontWeight.w600),
            ),
          );
        }

        // Filter items by selected category
        final categoryItems = menuState.items.where((item) {
          return item.category.toLowerCase() == widget.selectedCategory.toLowerCase();
        }).toList();

        final totalItems = categoryItems.length;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Bar: Category Title & Item Count Pill (Search Box Removed)
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${widget.selectedCategory} Selection",
                          style: kCategoryHeaderStyle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _getCategorySubtitle(widget.selectedCategory),
                          style: kCardDescriptionStyle.copyWith(fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Item Count Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: kAccentBlue.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      "$totalItems items",
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: kAccentBlue),
                    ),
                  ),
                ],
              ),
            ),

            // Grid items
            Expanded(
              child: categoryItems.isEmpty
                  ? Center(
                      child: Text(
                        "No items available in ${widget.selectedCategory}",
                        style: const TextStyle(color: kTextGrey, fontSize: 15, fontWeight: FontWeight.w500),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.only(left: 24, right: 24, bottom: 120),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 20,
                        mainAxisSpacing: 20,
                        childAspectRatio: 0.82, // Slightly taller aspect ratio for full-width bottom ADD button
                      ),
                      itemCount: categoryItems.length,
                      physics: const ClampingScrollPhysics(),
                      itemBuilder: (context, index) {
                        return _MenuCard(
                          key: ValueKey(categoryItems[index].itemId),
                          item: categoryItems[index],
                          cartNotifier: widget.cartNotifier,
                          serverHost: widget.serverHost,
                          imageCache: widget.imageCache,
                          isOnline: widget.isOnline,
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  String _getCategorySubtitle(String category) {
    switch (category.toLowerCase()) {
      case 'starters':
        return "Freshly prepared starters & finger bites";
      case 'main course':
        return "Hearty main dishes prepared fresh on order";
      case 'dessert':
      case 'desserts':
        return "Sweet endings & pastries to satisfy your cravings";
      case 'beverages':
      case 'drinks':
        return "Refreshments, mocktails, teas and coffees";
      default:
        return "Tasteful creations from our expert chefs";
    }
  }
}

class _MenuCard extends StatelessWidget {
  final MenuItem item;
  final CartNotifier cartNotifier;
  final String serverHost;
  final MenuImageCache imageCache;
  final bool isOnline;

  const _MenuCard({
    super.key,
    required this.item,
    required this.cartNotifier,
    required this.serverHost,
    required this.imageCache,
    required this.isOnline,
  });

  @override
  Widget build(BuildContext context) {
    // Check if item is veg via explicit field or fallback keyword detection
    final bool isVeg = item.hasIsVeg() ? item.isVeg : _checkIsVeg(item);

    return Material(
      color: kCardBg,
      borderRadius: kCardBorderRadius,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.08),
      clipBehavior: Clip.hardEdge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Image top frame — wrapped in ClipRRect for crisp corners
          Expanded(
            flex: 5,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CachedMenuImage(
                    cache: imageCache,
                    itemId: item.itemId,
                    imageUrl: item.imageUrl,
                    serverHost: serverHost,
                    fallback: _buildImagePlaceholder(),
                  ),
                ),

                // Dietary Badge (Slightly bigger: Dot for Veg, Triangle for Non-Veg)
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(6),
                      boxShadow: const [
                        BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                      ],
                    ),
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: isVeg ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Center(
                        child: isVeg
                            ? Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF2E7D32),
                                  shape: BoxShape.circle,
                                ),
                              )
                            : SizedBox(
                                width: 8,
                                height: 8,
                                child: CustomPaint(
                                  painter: const _TrianglePainter(color: Color(0xFFC62828)),
                                ),
                              ),
                      ),
                    ),
                  ),
                ),

                // Price Tag Badge Overlay
                Positioned(
                  bottom: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: kTextDark.withOpacity(0.85),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "₹${(item.price.toDouble() / 100.0).toStringAsFixed(0)}",
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Content bottom frame
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Title
                Text(
                  item.name,
                  style: kCardTitleStyle.copyWith(fontSize: 15),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),

                // Description
                Text(
                  item.description.isNotEmpty
                      ? item.description
                      : "Fresh delicious ${item.name} prepared by our chefs.",
                  style: kCardDescriptionStyle.copyWith(fontSize: 11, height: 1.25),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),

                // Full-width Bottom ADD / Stepper Button
                ValueListenableBuilder<CartSnapshot>(
                  valueListenable: cartNotifier,
                  builder: (context, cart, _) {
                    final qty = cart.quantityOf(item.itemId);
                    if (qty > 0) {
                      return _buildFullWidthStepper(qty);
                    }
                    return _buildFullWidthAddButton();
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _checkIsVeg(MenuItem item) {
    final lowerName = item.name.toLowerCase();
    final lowerDesc = item.description.toLowerCase();
    if (lowerName.contains('chicken') ||
        lowerName.contains('mutton') ||
        lowerName.contains('fish') ||
        lowerName.contains('prawn') ||
        lowerName.contains('egg') ||
        lowerDesc.contains('chicken') ||
        lowerDesc.contains('mutton') ||
        lowerDesc.contains('meat')) {
      return false;
    }
    return true;
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: kSidebarBg,
      child: const Center(
        child: Icon(Icons.restaurant_menu_rounded, size: 36, color: kTextGrey),
      ),
    );
  }

  Widget _buildFullWidthStepper(int qty) {
    return Container(
      height: 42,
      width: double.infinity,
      decoration: BoxDecoration(
        color: kScaffoldBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kAccentBlue.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)),
              onTap: isOnline
                  ? () {
                      HapticFeedback.lightImpact();
                      cartNotifier.removeItem(item.itemId);
                    }
                  : null,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Icon(Icons.remove_rounded, color: kAccentBlue, size: 20),
              ),
            ),
          ),
          Text(
            '$qty',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextDark),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
              onTap: isOnline
                  ? () {
                      HapticFeedback.lightImpact();
                      cartNotifier.addItem(item.itemId);
                    }
                  : null,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Icon(Icons.add_rounded, color: Colors.green, size: 20),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFullWidthAddButton() {
    final bool canAdd = item.isAvailable && isOnline;
    return SizedBox(
      height: 42,
      width: double.infinity,
      child: Material(
        color: canAdd ? kAccentBlue : Colors.grey.shade300,
        borderRadius: BorderRadius.circular(12),
        elevation: canAdd ? 1 : 0,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: canAdd
              ? () {
                  HapticFeedback.lightImpact();
                  cartNotifier.addItem(item.itemId);
                }
              : null,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.add_rounded,
                size: 18,
                color: canAdd ? Colors.white : Colors.grey.shade600,
              ),
              const SizedBox(width: 6),
              Text(
                "ADD TO CART",
                style: TextStyle(
                  color: canAdd ? Colors.white : Colors.grey.shade600,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrianglePainter extends CustomPainter {
  final Color color;

  const _TrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _TrianglePainter oldDelegate) => oldDelegate.color != color;
}
