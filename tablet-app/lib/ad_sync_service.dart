import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'constants.dart';
import 'isolate_worker.dart';

typedef PlaylistUpdateCallback = void Function(List<String> playlist, List<String> activeFileNames);

/// Tracks download/sync progress for UI display.
class SyncProgress {
  final bool isActive;
  final String label;           // e.g. "Downloading ads..." or "Fetching menu..."
  final int filesCompleted;
  final int filesTotal;
  final int bytesDownloaded;
  final int bytesTotal;
  final String currentFileName; // e.g. "ad_123.mp4"

  const SyncProgress.idle()
      : isActive = false,
        label = '',
        filesCompleted = 0,
        filesTotal = 0,
        bytesDownloaded = 0,
        bytesTotal = 0,
        currentFileName = '';

  const SyncProgress({
    required this.isActive,
    required this.label,
    required this.filesCompleted,
    required this.filesTotal,
    required this.bytesDownloaded,
    required this.bytesTotal,
    required this.currentFileName,
  });

  double get fileProgress =>
      filesTotal > 0 ? filesCompleted / filesTotal : 0;

  double get byteProgress =>
      bytesTotal > 0 ? bytesDownloaded / bytesTotal : 0;

  SyncProgress copyWith({
    bool? isActive,
    String? label,
    int? filesCompleted,
    int? filesTotal,
    int? bytesDownloaded,
    int? bytesTotal,
    String? currentFileName,
  }) {
    return SyncProgress(
      isActive: isActive ?? this.isActive,
      label: label ?? this.label,
      filesCompleted: filesCompleted ?? this.filesCompleted,
      filesTotal: filesTotal ?? this.filesTotal,
      bytesDownloaded: bytesDownloaded ?? this.bytesDownloaded,
      bytesTotal: bytesTotal ?? this.bytesTotal,
      currentFileName: currentFileName ?? this.currentFileName,
    );
  }
}

class AdSyncService {
  final String serverHost;
  final String token;
  final String adsDirectory;
  final PlaylistUpdateCallback? onPlaylistUpdated;

  AdSyncService({
    required this.serverHost,
    required this.token,
    required this.adsDirectory,
    this.onPlaylistUpdated,
  });

  Timer? _syncTimer;
  int _syncRetryCount = 0;
  bool _isSyncing = false;
  bool _disposed = false;

  /// Public progress notifier — UI listens to this to show/hide download indicator.
  final ValueNotifier<SyncProgress> progress = ValueNotifier(const SyncProgress.idle());

  /// List of parsed ad campaign maps from the last successful sync.
  List<Map<String, dynamic>> adCampaigns = [];

  // Protected paths not to clean up (currently active playing paths)
  List<String> _protectedPaths = [];

  // ────────────────── Public API ──────────────────

  void setProtectedPaths(List<String> paths) {
    _protectedPaths = List.from(paths);
  }

  /// Boot sequence: ensure storage, attempt to sync with the server first.
  /// New ads are downloaded first and deleted ads are cleaned up before returning
  /// the active playlist. Falls back to cached local files if the server is offline.
  Future<List<String>> boot() async {
    await _ensureStorageReady();

    debugPrint('[BOOT] Attempting initial server sync and download...');
    try {
      final freshPlaylist = await _syncWithServer();
      if (freshPlaylist != null) {
        debugPrint('[BOOT] Sync successful. Active playlist size: ${freshPlaylist.length}');
        _schedulePeriodicSync();
        return freshPlaylist;
      }
    } catch (e) {
      debugPrint('[BOOT] Initial sync failed: $e. Falling back to cached playlist.');
    }

    final cached = await _loadCachedPlaylist();
    _schedulePeriodicSync();
    return cached;
  }

  /// Force an immediate sync attempt.
  void syncNow() {
    _attemptSync();
  }

  /// Release timers.
  void dispose() {
    _disposed = true;
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  // ────────────────── Storage init ──────────────────

  Future<void> _ensureStorageReady() async {
    final dir = Directory(adsDirectory);
    final exists = await dir.exists();
    if (!exists) {
      await dir.create(recursive: true);
      debugPrint('[SYNC] Created ads directory: $adsDirectory');
    }
  }

  // ────────────────── Cached playlist ──────────────────

  Future<List<String>> _loadCachedPlaylist() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getStringList(kPlaylistCacheKey) ?? [];

    if (cached.isNotEmpty) {
      final validFiles = <String>[];
      for (final path in cached) {
        if (path.startsWith('static__')) {
          validFiles.add(path);
        } else {
          final file = File(path);
          final exists = await file.exists();
          if (exists) {
            final length = await file.length();
            if (length > kMinValidFileSize) {
              validFiles.add(path);
            }
          }
        }
      }
      if (validFiles.isNotEmpty) {
        debugPrint('[BOOT] Found ${validFiles.length} cached ads on disk.');
        return validFiles;
      }
    }

    // Fallback: scan the directory for video files
    final dir = Directory(adsDirectory);
    final dirExists = await dir.exists();
    if (dirExists) {
      final entities = await dir.list().toList();
      final recovered = <String>[];
      for (final entity in entities) {
        if (entity is File) {
          final name = entity.path.split('/').last.split('\\').last;
          if (name.endsWith('.mp4') || name.endsWith('.webm')) {
            final length = await entity.length();
            if (length > kMinValidFileSize) {
              recovered.add(entity.path);
            }
          }
        }
      }
      if (recovered.isNotEmpty) {
        debugPrint('[BOOT] Recovered ${recovered.length} video files from disk scan.');
        prefs.setStringList(kPlaylistCacheKey, recovered);
        return recovered;
      }
    }

    debugPrint('[BOOT] No cached ads found.');
    return [];
  }

  // ────────────────── Sync engine ──────────────────

  Future<List<String>?> _syncWithServer() async {
    final url = Uri.parse('http://$serverHost:4200/api/v1/auth/device/ads');
    final response = await http.get(
      url,
      headers: {'Authorization': 'Bearer $token'},
    ).timeout(kHttpTimeout);

    if (response.statusCode == 200) {
      final data = await parseJsonInBackground(response.body);
      if (data['success'] == true) {
        final List serverAds = data['data'] ?? [];
        _syncRetryCount = 0;

        debugPrint('[SYNC] Server reachable. Got ${serverAds.length} ads.');

        adCampaigns = serverAds
            .map((item) => Map<String, dynamic>.from(item))
            .toList();

        final List<String> newLocalPaths = [];
        final List<String> activeFileNames = [];

        // First pass: identify which files need downloading
        final List<Map<String, dynamic>> filesToDownload = [];
        for (final ad in serverAds) {
          final mediaUrl = ad['mediaUrl'] as String? ?? '';
          final bookingId = ad['bookingId'] as String? ?? 'unknown';

          if (mediaUrl.isNotEmpty &&
              (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'))) {
            final absoluteUrl = mediaUrl.startsWith('http')
                ? mediaUrl
                : 'http://$serverHost:4200$mediaUrl';

            final fileExt = mediaUrl.split('.').last;
            final fileName = 'ad_$bookingId.$fileExt';
            final localFile = File('$adsDirectory/$fileName');
            activeFileNames.add(fileName);

            final exists = await localFile.exists();
            bool needsDownload = !exists;
            if (exists) {
              final length = await localFile.length();
              needsDownload = length < kMinValidFileSize;
            }

            if (needsDownload) {
              filesToDownload.add({
                'url': absoluteUrl,
                'file': localFile,
                'name': fileName,
              });
            }
            newLocalPaths.add(localFile.path);
          } else {
            newLocalPaths.add(
              'static__${ad['bookingId']}__${ad['title'] ?? ''}__${ad['subtitle'] ?? ad['description'] ?? ''}',
            );
          }
        }

        // Second pass: download files with progress reporting
        final totalFiles = filesToDownload.length;
        if (totalFiles > 0) {
          progress.value = SyncProgress(
            isActive: true,
            label: 'Downloading ads...',
            filesCompleted: 0,
            filesTotal: totalFiles,
            bytesDownloaded: 0,
            bytesTotal: 0,
            currentFileName: '',
          );
        }

        for (int i = 0; i < filesToDownload.length; i++) {
          final fileInfo = filesToDownload[i];
          final fileName = fileInfo['name'] as String;
          final file = fileInfo['file'] as File;
          final url = fileInfo['url'] as String;

          progress.value = progress.value.copyWith(
            currentFileName: fileName,
            bytesDownloaded: 0,
            bytesTotal: 0,
          );

          final success = await _downloadWithProgress(url, file, (downloaded, total) {
            if (!_disposed) {
              progress.value = progress.value.copyWith(
                bytesDownloaded: downloaded,
                bytesTotal: total,
              );
            }
          });

          if (success) {
            progress.value = progress.value.copyWith(
              filesCompleted: i + 1,
            );
          } else {
            debugPrint('[DOWNLOAD] Skipping ad after failed download.');
          }
        }

        // Mark sync as complete
        if (totalFiles > 0) {
          progress.value = const SyncProgress.idle();
        }

        // 2. Persist playlist to cache (fire-and-forget)
        SharedPreferences.getInstance().then((prefs) {
          prefs.setStringList(kPlaylistCacheKey, newLocalPaths);
          prefs.setString(kLastSyncTimeKey, DateTime.now().toIso8601String());
        });

        // 3. Cleanup deleted ads from disk
        await _cleanupOldFiles(activeFileNames);

        return newLocalPaths;
      }
    }
    return null;
  }

  void _attemptSync() async {
    if (_disposed || _isSyncing) return;
    _isSyncing = true;

    try {
      final freshPlaylist = await _syncWithServer();
      if (freshPlaylist != null) {
        final List<String> activeFileNames = [];
        for (final path in freshPlaylist) {
          if (!path.startsWith('static__')) {
            activeFileNames.add(path.split('/').last.split('\\').last);
          }
        }
        onPlaylistUpdated?.call(freshPlaylist, activeFileNames);
        _schedulePeriodicSync();
      } else {
        _scheduleRetrySync();
      }
    } catch (e) {
      debugPrint('[SYNC] Background sync failed: $e');
      _scheduleRetrySync();
    } finally {
      _isSyncing = false;
    }
  }

  void _scheduleRetrySync() {
    if (_disposed) return;
    _syncTimer?.cancel();
    _syncRetryCount++;
    debugPrint('[SYNC] Scheduling retry in ${kSyncRetryDelay.inSeconds}s (attempt #$_syncRetryCount)');
    _syncTimer = Timer(kSyncRetryDelay, () {
      if (!_disposed) _attemptSync();
    });
  }

  void _schedulePeriodicSync() {
    if (_disposed) return;
    _syncTimer?.cancel();
    _syncRetryCount = 0;
    _syncTimer = Timer.periodic(kSyncInterval, (_) {
      if (!_disposed) _attemptSync();
    });
  }

  // ────────────────── Download ──────────────────

  /// Download with byte-level progress reporting.
  /// [onProgress] is called with (bytesDownloaded, totalBytes) as data arrives.
  Future<bool> _downloadWithProgress(
    String url,
    File targetFile,
    void Function(int downloaded, int total) onProgress,
  ) async {
    final client = http.Client();
    for (int attempt = 1; attempt <= kMaxDownloadRetries; attempt++) {
      IOSink? sink;
      try {
        debugPrint('[DOWNLOAD] Attempt $attempt: $url');
        final request = http.Request('GET', Uri.parse(url));
        final response = await client.send(request).timeout(kDownloadTimeout);

        if (response.statusCode == 200) {
          final totalBytes = response.contentLength ?? 0;
          final tempFile = File('${targetFile.path}.tmp');
          final tempExists = await tempFile.exists();
          if (tempExists) {
            await tempFile.delete();
          }
          sink = tempFile.openWrite();
          int downloaded = 0;
          await response.stream.forEach((chunk) {
            sink!.add(chunk);
            downloaded += chunk.length;
            onProgress(downloaded, totalBytes);
          });
          await sink.flush();
          await sink.close();
          sink = null;

          final length = await tempFile.length();
          if (length > kMinValidFileSize) {
            final targetExists = await targetFile.exists();
            if (targetExists) {
              await targetFile.delete();
            }
            await tempFile.rename(targetFile.path);
            final sizeKB = (length / 1024).round();
            debugPrint('[DOWNLOAD] Success: ${targetFile.path} ($sizeKB KB)');
            client.close();
            return true;
          } else {
            await tempFile.delete();
            debugPrint('[DOWNLOAD] Downloaded file too small: $length bytes');
          }
        } else {
          debugPrint('[DOWNLOAD] Bad response: status=${response.statusCode}');
        }
      } catch (e) {
        debugPrint('[DOWNLOAD] Attempt $attempt failed: $e');
      } finally {
        if (sink != null) {
          try {
            await sink.close();
          } catch (_) {}
        }
      }

      if (attempt < kMaxDownloadRetries) {
        await Future.delayed(Duration(seconds: 2 * attempt));
      }
    }
    client.close();
    return false;
  }

  Future<void> _cleanupOldFiles(List<String> activeFileNames) async {
    try {
      final dir = Directory(adsDirectory);
      final exists = await dir.exists();
      if (!exists) return;

      await for (final entity in dir.list()) {
        if (entity is File) {
          final name = entity.path.split('/').last.split('\\').last;
          if (name.startsWith('ad_') && !activeFileNames.contains(name)) {
            // Also protect active files playing currently
            if (_protectedPaths.contains(entity.path)) {
              debugPrint('[CLEANUP] Skipping active protected file: ${entity.path}');
              continue;
            }
            debugPrint('[CLEANUP] Removing old ad file: ${entity.path}');
            await entity.delete();
          }
        }
      }
    } catch (e) {
      debugPrint('[CLEANUP] Error: $e');
    }
  }
}
