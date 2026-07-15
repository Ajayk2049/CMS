import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import 'generated/menu.pbgrpc.dart';

/// Downloads and caches food-menu images to local app storage so the
/// catalog can render fully offline.
///
/// On each menu fetch we:
///  - Look at every item's imageUrl.
///  - Download any image we don't have on disk.
///  - Store the file under the app's documents dir at
///    `<docs>/menu_images/<itemId>.img`.
///
/// The catalog/UI then asks [MenuImageCache.localPathFor] before
/// rendering. If a local copy exists we serve it as a `FileImage`; if not
/// we fall back to `Image.network` and try to fill the cache next time.
class MenuImageCache {
  final String serverHost;
  final int httpPort;
  final http.Client _client;
  Directory? _imagesDir;

  /// Per-item download progress (itemId -> 0..1) for the optional overlay.
  final Map<String, double> progress = {};

  /// Total downloads completed in the current batch.
  int _downloaded = 0;
  int get downloaded => _downloaded;
  int _total = 0;
  int get total => _total;

  /// True while a priming batch is in flight.
  bool get isPriming => _priming != null;
  Future<int>? _priming;

  MenuImageCache({required this.serverHost, this.httpPort = 4200})
      : _client = http.Client();

  Future<Directory> _ensureDir() async {
    if (_imagesDir != null) return _imagesDir!;
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/menu_images');
    if (!await dir.exists()) await dir.create(recursive: true);
    _imagesDir = dir;
    return dir;
  }

  /// Build the absolute http URL for a server-relative imageUrl.
  String _resolveUrl(String imageUrl) {
    if (imageUrl.isEmpty) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return 'http://$serverHost:$httpPort$imageUrl';
  }

  /// Local on-disk file for a given item, or null if not yet cached.
  /// Async variant used during initial priming.
  Future<File?> localFileFor(String itemId) async {
    if (itemId.isEmpty) return null;
    final dir = await _ensureDir();
    final f = File('${dir.path}/$itemId.img');
    if (await f.exists() && await f.length() > 0) return f;
    return null;
  }

  /// Iterate the menu and download every missing image. Skips items that
  /// already have a local file. Returns the number of NEW images downloaded.
  Future<int> primeFromMenu(List<MenuItem> items) {
    final future = _doPrime(items);
    _priming = future;
    return future;
  }

  Future<int> _doPrime(List<MenuItem> items) async {
    if (items.isEmpty) {
      _priming = null;
      return 0;
    }
    await _ensureDir();
    _downloaded = 0;
    _total = 0;
    progress.clear();

    final pending = <MenuItem>[];
    for (final item in items) {
      if (item.imageUrl.isEmpty) continue;
      final cached = await localFileFor(item.itemId);
      if (cached != null) continue;
      pending.add(item);
    }
    _total = pending.length;
    if (_total == 0) {
      _priming = null;
      return 0;
    }

    int newCount = 0;
    for (final item in pending) {
      final url = _resolveUrl(item.imageUrl);
      final ok = await _downloadOne(item.itemId, url);
      progress[item.itemId] = 1.0;
      if (ok) {
        newCount++;
        _downloaded++;
      }
    }
    _priming = null;
    return newCount;
  }

  Future<bool> _downloadOne(String itemId, String url) async {
    if (url.isEmpty) return false;
    try {
      final dir = await _ensureDir();
      final target = File('${dir.path}/$itemId.img.tmp');
      if (await target.exists()) await target.delete();
      final resp = await _client.get(Uri.parse(url));
      if (resp.statusCode != 200 || resp.bodyBytes.isEmpty) return false;
      await target.writeAsBytes(resp.bodyBytes, flush: true);
      final finalFile = File('${dir.path}/$itemId.img');
      if (await finalFile.exists()) await finalFile.delete();
      await target.rename(finalFile.path);
      return true;
    } catch (e) {
      debugPrint('[MENU_IMG] failed $itemId: $e');
      return false;
    }
  }

  /// Drop every cached image. Called by "Reset device" to free disk.
  Future<void> clear() async {
    final dir = await _ensureDir();
    if (await dir.exists()) {
      await for (final entity in dir.list()) {
        try {
          await entity.delete(recursive: true);
        } catch (_) {}
      }
    }
  }

  void dispose() {
    _client.close();
  }
}
