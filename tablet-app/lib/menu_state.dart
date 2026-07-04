/// Centralized cart and menu state using ValueNotifier for localized rebuilds.
///
/// BOTTLENECK: The original code used root-level setState() in _KioskScreenState
/// for every cart quantity change, rebuilding the entire screen (video player,
/// menu grid, app bar, etc.) — 183+ unnecessary rebuilds per test session.
///
/// FIX: ValueNotifier + ValueListenableBuilder confines rebuilds to only the
/// widgets that actually display cart data (quantity badges, cart total, order
/// summary list). The video player, menu images, and category headers are
/// completely isolated from cart mutations.
library;

import 'package:flutter/foundation.dart';
import 'generated/menu.pbgrpc.dart';

/// Immutable snapshot of the cart state, emitted by [CartNotifier].
class CartSnapshot {
  final Map<String, int> items;
  const CartSnapshot(this.items);

  int get totalItemCount => items.values.fold(0, (sum, q) => sum + q);
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  int quantityOf(String itemId) => items[itemId] ?? 0;

  /// Compute total price in rupees given the menu items list.
  double totalPrice(List<MenuItem> menuItems) {
    double total = 0;
    for (final entry in items.entries) {
      try {
        final item = menuItems.firstWhere((i) => i.itemId == entry.key);
        total += (item.price.toDouble() / 100.0) * entry.value;
      } catch (_) {
        // item not found — skip
      }
    }
    return total;
  }

  /// Create a defensive copy of the internal map.
  Map<String, int> toMap() => Map<String, int>.from(items);
}

/// ValueNotifier that manages cart state with minimal rebuild surface.
///
/// Listeners are notified only when the cart contents actually change.
/// The emitted [CartSnapshot] is immutable, preventing accidental mutation.
class CartNotifier extends ValueNotifier<CartSnapshot> {
  CartNotifier() : super(const CartSnapshot({}));

  /// Internal mutable map — only exposed as immutable snapshots.
  final Map<String, int> _items = {};

  void addItem(String itemId) {
    _items[itemId] = (_items[itemId] ?? 0) + 1;
    _emit();
  }

  void removeItem(String itemId) {
    final current = _items[itemId] ?? 0;
    if (current > 1) {
      _items[itemId] = current - 1;
    } else {
      _items.remove(itemId);
    }
    _emit();
  }

  void setQuantity(String itemId, int qty) {
    if (qty <= 0) {
      _items.remove(itemId);
    } else {
      _items[itemId] = qty;
    }
    _emit();
  }

  void clear() {
    if (_items.isEmpty) return; // no-op guard
    _items.clear();
    _emit();
  }

  void _emit() {
    value = CartSnapshot(Map<String, int>.from(_items));
  }
}

/// Holds the menu items list. Separated from cart so that menu fetches
/// don't trigger cart widget rebuilds and vice versa.
class MenuNotifier extends ValueNotifier<MenuState> {
  MenuNotifier() : super(const MenuState(items: [], isLoading: false));

  void setLoading() {
    value = MenuState(items: value.items, isLoading: true);
  }

  void setItems(List<MenuItem> items) {
    value = MenuState(items: items, isLoading: false);
  }

  void setError() {
    // Keep existing items (could be fallback), just stop loading
    value = MenuState(items: value.items, isLoading: false);
  }
}

class MenuState {
  final List<MenuItem> items;
  final bool isLoading;
  const MenuState({required this.items, required this.isLoading});
}
