import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'constants.dart';

class AdPlayerState {
  final String currentSource;
  final List<String> playlist;
  final bool isTransitioning;

  const AdPlayerState({
    this.currentSource = '',
    this.playlist = const [],
    this.isTransitioning = false,
  });
}

typedef AdImpressionCallback = void Function(String adSource);

class AdPlayerService {
  final ValueNotifier<AdPlayerState> state = ValueNotifier(const AdPlayerState());
  final AdImpressionCallback? onImpression;

  AdPlayerService({this.onImpression}) {
    _channel.setMethodCallHandler(_handleMethodCall);
  }

  static const MethodChannel _channel = MethodChannel('com.example.tabletop_ordering_app/native_video');

  List<String> _playlist = [];
  int _currentIndex = 0;
  Timer? _gapTimer;
  bool _isPaused = false;
  bool _disposed = false;

  List<String> get activeFilePaths {
    if (_playlist.isEmpty) return [];
    final path = _currentSource;
    if (path.startsWith('static__')) return [];
    return [path];
  }

  void startLoop(List<String> playlist) {
    if (_disposed) return;
    _playlist = List.from(playlist);
    _currentIndex = 0;
    _playCurrent();
  }

  void updatePlaylist(List<String> newPlaylist) {
    if (_disposed) return;
    if (newPlaylist.isEmpty) {
      _stopAndClear();
      _playlist = [];
      _currentIndex = 0;
      _emitState();
      return;
    }
    final oldSource = _currentSource;
    _playlist = List.from(newPlaylist);
    final oldIndex = newPlaylist.indexOf(oldSource);
    if (oldIndex >= 0) {
      _currentIndex = oldIndex;
    } else {
      _currentIndex = 0;
      if (!_isPaused) _playCurrent();
    }
    _emitState();
  }

  void pause() {
    _isPaused = true;
    _stopAndClear();
    _emitState();
  }

  void resume() {
    if (_disposed) return;
    _isPaused = false;
    if (_playlist.isNotEmpty) _playCurrent();
  }

  void dispose() {
    _disposed = true;
    _gapTimer?.cancel();
    state.dispose();
  }

  String get _currentSource =>
      _currentIndex >= 0 && _currentIndex < _playlist.length
          ? _playlist[_currentIndex]
          : '';

  void _playCurrent() {
    if (_disposed) return;
    final source = _currentSource;

    if (source.isEmpty) {
      _emitState();
      return;
    }

    if (source.startsWith('static__')) {
      _emitState();
      _gapTimer = Timer(kStaticAdDisplayDuration, () {
        if (!_disposed && !_isPaused) _advance();
      });
      return;
    }

    // Black gap transition to give the native player time to load
    _emitState(isTransitioning: true);
    _gapTimer = Timer(kTransitionBlackDuration, () {
      if (_disposed || _isPaused) return;
      _emitState(); // Show video view
    });
  }

  void _advance() {
    if (_disposed || _playlist.isEmpty || _isPaused) return;
    _currentIndex = (_currentIndex + 1) % _playlist.length;
    _playCurrent();
  }

  void _stopAndClear() {
    _gapTimer?.cancel();
    _gapTimer = null;
  }

  Future<void> _handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'onVideoComplete':
        final args = call.arguments as Map;
        final path = args['path'] as String;
        if (path == _currentSource) {
          onImpression?.call(path);
          if (!_disposed && !_isPaused) _advance();
        }
        break;
      case 'onVideoError':
        debugPrint('[NATIVE_PLAYER] Playback error: ${call.arguments}');
        if (!_disposed && !_isPaused) _advance();
        break;
    }
  }

  void _emitState({bool isTransitioning = false}) {
    if (_disposed) return;
    state.value = AdPlayerState(
      currentSource: _currentSource,
      playlist: List.unmodifiable(_playlist),
      isTransitioning: isTransitioning,
    );
  }
}
