import 'package:flutter/material.dart';
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
  int _currentPage = 0;
  String _activeSubcategory = 'All';

  @override
  void didUpdateWidget(MenuCatalogWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedCategory != widget.selectedCategory) {
      setState(() {
        _currentPage = 0;
        _activeSubcategory = 'All';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MenuState>(
      valueListenable: widget.menuNotifier,
      builder: (context, menuState, _) {
        if (menuState.isLoading) {
          return const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(kAccentBlue)));
        }
        if (menuState.items.isEmpty) {
          return const Center(child: Text("No menu items available.", style: TextStyle(color: kTextGrey)));
        }

        // Filter items by category first
        final categoryItems = menuState.items.where((item) {
          return item.category.toLowerCase() == widget.selectedCategory.toLowerCase();
        }).toList();

        final totalItems = categoryItems.length;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Subcategory Selection & Info Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${widget.selectedCategory} Picks",
                          style: kCategoryHeaderStyle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getCategorySubtitle(widget.selectedCategory),
                          style: kCardDescriptionStyle.copyWith(fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  // Item Count Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: kSidebarBg,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      "$totalItems items",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextDark),
                    ),
                  ),
                ],
              ),
            ),

            // Grid items
            Expanded(
              child: categoryItems.isEmpty
                  ? const Center(
                      child: Text(
                        "No items match the selected category.",
                        style: TextStyle(color: kTextGrey, fontSize: 16),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.only(left: 24, right: 24, bottom: 120),
                      gridDelegate: kMenuGridDelegate,
                      itemCount: categoryItems.length,
                      physics: const BouncingScrollPhysics(),
                      itemBuilder: (context, index) {
                        return _MenuCard(
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
        return "Freshly prepared starters and finger bites";
      case 'main course':
        return "Hearty main dishes prepared fresh on order";
      case 'dessert':
      case 'desserts':
        return "Sweet endings and pastries to satisfy your cravings";
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
    required this.item,
    required this.cartNotifier,
    required this.serverHost,
    required this.imageCache,
    required this.isOnline,
  });

  @override
  Widget build(BuildContext context) {
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
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Image top frame — prefer local cache, fall back to network
          Expanded(
            flex: 5,
            child: CachedMenuImage(
              cache: imageCache,
              itemId: item.itemId,
              imageUrl: item.imageUrl,
              serverHost: serverHost,
              fallback: _buildImagePlaceholder(),
            ),
          ),
          // Content bottom frame
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title and Price row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.name,
                        style: kCardTitleStyle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      "₹${(item.price.toDouble() / 100.0).toStringAsFixed(0)}",
                      style: kCardPriceStyle,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Description
                Text(
                  item.description.isNotEmpty ? item.description : "Fresh delicious ${item.name} prepared by our chefs.",
                  style: kCardDescriptionStyle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                // Bottom row: Cart Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // Action button
                    SizedBox(
                      height: 38,
                      child: ValueListenableBuilder<CartSnapshot>(
                        valueListenable: cartNotifier,
                        builder: (context, cart, _) {
                          final qty = cart.quantityOf(item.itemId);
                          if (qty > 0) {
                            return _buildStepper(qty);
                          }
                          return _buildAddButton();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: kSidebarBg,
      child: const Icon(Icons.restaurant_menu_rounded, size: 36, color: kTextGrey),
    );
  }

  Widget _buildStepper(int qty) {
    return Container(
      decoration: BoxDecoration(
        color: kScaffoldBg,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            constraints: const BoxConstraints(),
            padding: const EdgeInsets.all(6),
            icon: const Icon(Icons.remove, color: kAccentBlue, size: 16),
            onPressed: isOnline ? () => cartNotifier.removeItem(item.itemId) : null,
          ),
          const SizedBox(width: 4),
          Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextDark)),
          const SizedBox(width: 4),
          IconButton(
            constraints: const BoxConstraints(),
            padding: const EdgeInsets.all(6),
            icon: const Icon(Icons.add, color: Colors.green, size: 16),
            onPressed: isOnline ? () => cartNotifier.addItem(item.itemId) : null,
          ),
        ],
      ),
    );
  }

  Widget _buildAddButton() {
    final bool canAdd = item.isAvailable && isOnline;
    return GestureDetector(
      onTap: canAdd ? () => cartNotifier.addItem(item.itemId) : null,
      child: Container(
        decoration: BoxDecoration(
          color: canAdd ? Colors.red : Colors.grey.shade300,
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Text(
          "Add",
          style: TextStyle(
            color: canAdd ? Colors.white : Colors.grey.shade600,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
    );
  }


}
