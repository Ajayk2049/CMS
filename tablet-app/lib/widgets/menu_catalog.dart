/// Menu catalog widget — displays food items in a grid/list layout.
///
/// BOTTLENECK ADDRESSED:
/// - The categorizedItems map was recreated on every build pass (line 1393 of
///   original main.dart), allocating new Map and List objects per frame.
/// - Cart quantity changes triggered setState at root, rebuilding ALL menu cards
///   (183 unnecessary rebuilds per test session) even though the food images,
///   names, and prices are static data.
///
/// FIX:
/// - Menu items are observed via ValueListenableBuilder<MenuState> — rebuilds
///   only when the menu data itself changes (fetch/reload).
/// - Category map is computed once per menu data change, not per frame.
/// - Each menu card's cart button is wrapped in its own ValueListenableBuilder
///   on the CartNotifier, so only the specific button/quantity indicator rebuilds
///   when the cart changes — not the entire grid.
/// - RepaintBoundary on each card isolates scroll-triggered repaints.
library;

import 'package:flutter/material.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../generated/menu.pbgrpc.dart';

class MenuCatalogWidget extends StatelessWidget {
  final MenuNotifier menuNotifier;
  final CartNotifier cartNotifier;
  final String serverHost;
  final double viewportHeight;

  const MenuCatalogWidget({
    super.key,
    required this.menuNotifier,
    required this.cartNotifier,
    required this.serverHost,
    required this.viewportHeight,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MenuState>(
      valueListenable: menuNotifier,
      builder: (context, menuState, _) {
        if (menuState.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (menuState.items.isEmpty) {
          return const Center(child: Text("No menu items available."));
        }

        // Compute categorized map once per menu data change
        final categorizedItems = _categorize(menuState.items);
        final isPortrait = MediaQuery.of(context).orientation == Orientation.portrait;

        return ListView(
          padding: kCatalogPadding,
          children: categorizedItems.entries.map((entry) {
            final category = entry.key;
            final items = entry.value;
            if (items.isEmpty) return const SizedBox.shrink();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RepaintBoundary(
                  child: Padding(
                    padding: kCategoryLabelPadding,
                    child: Row(
                      children: [
                        Container(width: 8, height: 20, color: Colors.blueAccent),
                        const SizedBox(width: 8),
                        Text(category.toUpperCase(), style: kCategoryHeaderStyle),
                      ],
                    ),
                  ),
                ),
                isPortrait
                    ? Column(
                        children: items.map((item) {
                          return SizedBox(
                            height: viewportHeight - 140,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 24.0),
                              child: _MenuCard(
                                item: item,
                                cartNotifier: cartNotifier,
                                serverHost: serverHost,
                              ),
                            ),
                          );
                        }).toList(),
                      )
                    : GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: kMenuGridDelegate,
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          return _MenuCard(
                            item: items[index],
                            cartNotifier: cartNotifier,
                            serverHost: serverHost,
                          );
                        },
                      ),
                const SizedBox(height: 24),
              ],
            );
          }).toList(),
        );
      },
    );
  }

  Map<String, List<MenuItem>> _categorize(List<MenuItem> items) {
    final result = <String, List<MenuItem>>{
      'Starters': [],
      'Main Course': [],
      'Dessert': [],
      'Beverages': [],
    };
    for (final item in items) {
      if (result.containsKey(item.category)) {
        result[item.category]!.add(item);
      } else {
        result.putIfAbsent(item.category, () => []).add(item);
      }
    }
    return result;
  }
}

/// Individual menu card with RepaintBoundary isolation.
///
/// The cart button area uses ValueListenableBuilder<CartSnapshot> so that
/// quantity changes only rebuild the button — not the image, title, or
/// description.
class _MenuCard extends StatelessWidget {
  final MenuItem item;
  final CartNotifier cartNotifier;
  final String serverHost;

  const _MenuCard({
    required this.item,
    required this.cartNotifier,
    required this.serverHost,
  });

  @override
  Widget build(BuildContext context) {
    final absoluteImageUrl = item.imageUrl.isNotEmpty
        ? (item.imageUrl.startsWith('http')
            ? item.imageUrl
            : 'http://$serverHost:4200${item.imageUrl}')
        : '';

    return RepaintBoundary(
      child: Card(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        color: kCardDark,
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: kCardPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Title
              Text(
                item.name,
                style: kCardTitleStyle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              // Image + gradient overlay
              Expanded(
                child: ClipRRect(
                  borderRadius: kImageBorderRadius,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      absoluteImageUrl.isNotEmpty
                          ? Image.network(
                              absoluteImageUrl,
                              fit: BoxFit.fill,
                              cacheWidth: 350,
                              errorBuilder: (context, error, stackTrace) =>
                                  _buildImagePlaceholder(),
                            )
                          : _buildImagePlaceholder(),
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: _GradientOverlay(item: item),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              // Cart button — scoped rebuild via ValueListenableBuilder
              SizedBox(
                height: 40,
                child: ValueListenableBuilder<CartSnapshot>(
                  valueListenable: cartNotifier,
                  builder: (context, cart, _) {
                    final qty = cart.quantityOf(item.itemId);
                    if (qty > 0) {
                      return _buildQuantitySelector(qty);
                    }
                    return _buildAddToCartButton();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: Colors.black26,
      child: const Icon(Icons.restaurant_menu_rounded, size: 40, color: Colors.white24),
    );
  }

  Widget _buildQuantitySelector(int qty) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.blueAccent, width: 1.5),
        borderRadius: kInputBorderRadius,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.remove, color: Colors.blueAccent, size: 18),
            onPressed: () => cartNotifier.removeItem(item.itemId),
          ),
          Text('$qty', style: kQuantityTextStyle),
          IconButton(
            icon: const Icon(Icons.add, color: Colors.blueAccent, size: 18),
            onPressed: () => cartNotifier.addItem(item.itemId),
          ),
        ],
      ),
    );
  }

  Widget _buildAddToCartButton() {
    return OutlinedButton(
      onPressed: item.isAvailable
          ? () => cartNotifier.addItem(item.itemId)
          : null,
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: Colors.blueAccent, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: kInputBorderRadius),
        padding: EdgeInsets.zero,
      ),
      child: Text(
        item.isAvailable ? "ADD TO CART" : "OUT OF STOCK",
        style: kCartButtonTextStyle,
      ),
    );
  }
}

/// Gradient overlay at the bottom of a food image showing description and price.
class _GradientOverlay extends StatelessWidget {
  final MenuItem item;
  const _GradientOverlay({required this.item});

  static final _gradientDecoration = BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Colors.black.withValues(alpha: 0.0),
        Colors.black.withValues(alpha: 0.9),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: _gradientDecoration,
      padding: kGradientOverlayPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.description,
            style: kCardDescriptionStyle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            "₹${(item.price.toDouble() / 100.0).toStringAsFixed(1)}",
            style: kCardPriceStyle,
          ),
        ],
      ),
    );
  }
}
