import 'package:flutter/material.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../generated/menu.pbgrpc.dart';

class MenuCatalogWidget extends StatefulWidget {
  final MenuNotifier menuNotifier;
  final CartNotifier cartNotifier;
  final String serverHost;
  final double viewportHeight;
  final String selectedCategory;

  const MenuCatalogWidget({
    super.key,
    required this.menuNotifier,
    required this.cartNotifier,
    required this.serverHost,
    required this.viewportHeight,
    required this.selectedCategory,
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

        // Subcategory filters for Beverages/Drinks
        final hasSubcategories = widget.selectedCategory.toLowerCase() == 'beverages' || 
                                 widget.selectedCategory.toLowerCase() == 'drinks';

        List<MenuItem> filteredItems = categoryItems;
        if (hasSubcategories) {
          filteredItems = categoryItems.where((item) {
            final name = item.name.toLowerCase();
            if (_activeSubcategory == 'Hot Drinks') {
              return name.contains('latte') || name.contains('coffee') || name.contains('tea') || 
                     name.contains('espresso') || name.contains('cappuccino') || name.contains('hot');
            } else if (_activeSubcategory == 'Cold Drinks') {
              return name.contains('iced') || name.contains('cold') || name.contains('shake') || 
                     name.contains('soda') || name.contains('juice') || name.contains('smoothie') || 
                     name.contains('mojito') || name.contains('lemonade') || name.contains('beer');
            }
            return true; // 'All'
          }).toList();
        }

        final totalItems = filteredItems.length;
        const itemsPerPage = 6;
        final totalPages = (totalItems / itemsPerPage).ceil();

        // Reset page if out of bounds
        if (_currentPage >= totalPages && totalPages > 0) {
          _currentPage = totalPages - 1;
        }

        // Paginate items (max 6)
        final pagedItems = filteredItems.skip(_currentPage * itemsPerPage).take(itemsPerPage).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Subcategory Selection & Info Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${widget.selectedCategory} Picks",
                        style: kCategoryHeaderStyle,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _getCategorySubtitle(widget.selectedCategory),
                        style: kCardDescriptionStyle.copyWith(fontSize: 13),
                      ),
                    ],
                  ),
                  // Subcategories (Hot / Cold Drinks)
                  if (hasSubcategories)
                    Row(
                      children: ['All', 'Hot Drinks', 'Cold Drinks'].map((sub) {
                        final isSelected = _activeSubcategory == sub;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _activeSubcategory = sub;
                              _currentPage = 0;
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? kAccentBlue : kCardBg,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                )
                              ],
                            ),
                            child: Text(
                              sub,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.white : kTextDark,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    )
                  else
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
              child: pagedItems.isEmpty
                  ? const Center(
                      child: Text(
                        "No items match the selected subcategory.",
                        style: TextStyle(color: kTextGrey, fontSize: 16),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      gridDelegate: kMenuGridDelegate,
                      itemCount: pagedItems.length,
                      physics: const NeverScrollableScrollPhysics(), // Grid fits perfectly inside expanded
                      itemBuilder: (context, index) {
                        return _MenuCard(
                          item: pagedItems[index],
                          cartNotifier: widget.cartNotifier,
                          serverHost: widget.serverHost,
                        );
                      },
                    ),
            ),

            // Pagination Controls at the bottom
            if (totalPages > 1)
              Padding(
                padding: const EdgeInsets.only(bottom: 24, top: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Back button
                    GestureDetector(
                      onTap: _currentPage > 0
                          ? () {
                              setState(() {
                                _currentPage--;
                              });
                            }
                          : null,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _currentPage > 0 ? kCardBg : Colors.white24,
                          boxShadow: _currentPage > 0
                              ? const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))]
                              : null,
                        ),
                        padding: const EdgeInsets.all(12),
                        child: Icon(
                          Icons.arrow_back_ios_new,
                          color: _currentPage > 0 ? kAccentBlue : Colors.grey,
                          size: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 24),
                    Text(
                      "Page ${_currentPage + 1} of $totalPages",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextDark),
                    ),
                    const SizedBox(width: 24),
                    // Next button
                    GestureDetector(
                      onTap: _currentPage < totalPages - 1
                          ? () {
                              setState(() {
                                _currentPage++;
                              });
                            }
                          : null,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _currentPage < totalPages - 1 ? kCardBg : Colors.white24,
                          boxShadow: _currentPage < totalPages - 1
                              ? const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))]
                              : null,
                        ),
                        padding: const EdgeInsets.all(12),
                        child: Icon(
                          Icons.arrow_forward_ios,
                          color: _currentPage < totalPages - 1 ? kAccentBlue : Colors.grey,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
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
          // Image top frame
          Expanded(
            flex: 5,
            child: absoluteImageUrl.isNotEmpty
                ? Image.network(
                    absoluteImageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                        _buildImagePlaceholder(),
                  )
                : _buildImagePlaceholder(),
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
            onPressed: () => cartNotifier.removeItem(item.itemId),
          ),
          const SizedBox(width: 4),
          Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextDark)),
          const SizedBox(width: 4),
          IconButton(
            constraints: const BoxConstraints(),
            padding: const EdgeInsets.all(6),
            icon: const Icon(Icons.add, color: Colors.green, size: 16),
            onPressed: () => cartNotifier.addItem(item.itemId),
          ),
        ],
      ),
    );
  }

  Widget _buildAddButton() {
    return GestureDetector(
      onTap: item.isAvailable ? () => cartNotifier.addItem(item.itemId) : null,
      child: Container(
        decoration: BoxDecoration(
          color: item.isAvailable ? Colors.red : Colors.grey.shade300,
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: const Text(
          "Add",
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
    );
  }


}
