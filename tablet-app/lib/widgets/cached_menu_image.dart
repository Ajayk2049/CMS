import 'dart:io';

import 'package:flutter/material.dart';

import '../menu_image_cache.dart';

/// Image widget for a menu item that prefers the locally cached copy and
/// transparently falls back to the network URL when no local file exists.
///
/// Usage:
/// ```dart
/// CachedMenuImage(
///   cache: imageCache,
///   itemId: item.itemId,
///   imageUrl: item.imageUrl,
///   serverHost: '10.0.2.2',
///   fit: BoxFit.cover,
///   fallback: const Icon(Icons.restaurant_menu),
/// )
/// ```
class CachedMenuImage extends StatefulWidget {
  final MenuImageCache cache;
  final String itemId;
  final String imageUrl;
  final String serverHost;
  final int httpPort;
  final BoxFit fit;
  final Widget? fallback;

  const CachedMenuImage({
    super.key,
    required this.cache,
    required this.itemId,
    required this.imageUrl,
    required this.serverHost,
    this.httpPort = 4200,
    this.fit = BoxFit.cover,
    this.fallback,
  });

  @override
  State<CachedMenuImage> createState() => _CachedMenuImageState();
}

class _CachedMenuImageState extends State<CachedMenuImage> {
  File? _local;
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    _checkCache();
  }

  @override
  void didUpdateWidget(covariant CachedMenuImage old) {
    super.didUpdateWidget(old);
    if (old.itemId != widget.itemId || old.imageUrl != widget.imageUrl) {
      _checkCache();
    }
  }

  void _checkCache() {
    // 1. Try synchronous in-memory resolution first (Frame 1, zero flash!)
    final syncFile = widget.cache.localFileForSync(widget.itemId);
    if (syncFile != null) {
      _local = syncFile;
      _checked = true;
      return;
    }

    // 2. Otherwise fall back to async disk check
    _local = null;
    _checked = false;
    _loadLocal();
  }

  Future<void> _loadLocal() async {
    if (widget.imageUrl.isEmpty) {
      if (mounted) setState(() => _checked = true);
      return;
    }
    final f = await widget.cache.localFileFor(widget.itemId);
    if (!mounted) return;
    setState(() {
      _local = f;
      _checked = true;
    });
  }

  String get _networkUrl {
    final u = widget.imageUrl;
    if (u.isEmpty) return '';
    if (u.startsWith('http')) return u;
    return 'http://${widget.serverHost}:${widget.httpPort}$u';
  }

  @override
  Widget build(BuildContext context) {
    if (!_checked) {
      // Render the fallback while we look up the cache so the card has
      // a stable layout from the first frame.
      return widget.fallback ?? const SizedBox.shrink();
    }
    if (_local != null) {
      return Image.file(
        _local!,
        fit: widget.fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _network,
      );
    }
    return _network;
  }

  Widget get _network {
    final url = _networkUrl;
    if (url.isEmpty) return widget.fallback ?? const SizedBox.shrink();
    return Image.network(
      url,
      fit: widget.fit,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) => widget.fallback ?? const SizedBox.shrink(),
    );
  }
}
