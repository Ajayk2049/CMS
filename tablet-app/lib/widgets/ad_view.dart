/// Ad view widget — native Android platform view integration for 60fps.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../ad_player_service.dart';
import '../constants.dart';

class AdViewWidget extends StatelessWidget {
  final ValueNotifier<AdPlayerState> playerState;
  final String deviceId;
  final List<Map<String, dynamic>> adCampaigns;

  const AdViewWidget({
    super.key,
    required this.playerState,
    required this.deviceId,
    required this.adCampaigns,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AdPlayerState>(
      valueListenable: playerState,
      builder: (context, state, _) {
        if (state.playlist.isEmpty) {
          if (adCampaigns.isNotEmpty) {
            return _buildStandbyView();
          }
          return _buildWaitingView();
        }

        final isStatic = state.currentSource.startsWith('static__');
        final isTransitioning = state.isTransitioning;
        final hasVideo = !isStatic && !isTransitioning && state.currentSource.isNotEmpty;

        if (hasVideo) return _buildVideoView(state.currentSource);
        if (isStatic) return _buildStaticAdCard(state.currentSource);

        return Container(color: Colors.black);
      },
    );
  }

  Widget _buildStandbyView() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1E1B4B), // Premium dark indigo
            Color(0xFF0F0C20),
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
              child: const Icon(
                Icons.restaurant_menu_rounded,
                size: 80,
                color: Colors.amberAccent,
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              "WELCOME",
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 8,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "TAP ANYWHERE TO ORDER",
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white.withValues(alpha: 0.6),
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaitingView() {
    return Container(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.tv_off_rounded, size: 80, color: Colors.blueAccent),
              const SizedBox(height: 20),
              const Text(
                "NO AD CAMPAIGNS ACTIVE",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white70,
                  letterSpacing: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                "Server returned 0 ads for this outlet.\nBook and approve ad campaigns in the admin portal to see them here.",
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoView(String videoPath) {
    // Configured by user to best screen scaling proportions
    const double baseWidth = 1600.0;
    const double baseHeight = 1050.0;
    const double overflowW = baseWidth + 160.0;
    const double leftOffset = -15.0;

    final videoPaths = playerState.value.playlist
        .where((path) => !path.startsWith('static__') && path.isNotEmpty)
        .toList();

    final currentSource = playerState.value.currentSource;
    int initialIndex = 0;
    if (!currentSource.startsWith('static__') && currentSource.isNotEmpty) {
      initialIndex = videoPaths.indexOf(currentSource);
      if (initialIndex < 0) initialIndex = 0;
    }

    return RepaintBoundary(
      child: ClipRect(
        child: OverflowBox(
          alignment: Alignment.centerLeft,
          minWidth: 0.0,
          maxWidth: overflowW,
          minHeight: 0.0,
          maxHeight: baseHeight,
          child: Transform.translate(
            offset: const Offset(leftOffset, 0),
            child: IgnorePointer(
              child: SizedBox(
                width: overflowW,
                height: baseHeight,
                child: AndroidView(
                  key: const Key('native_ad_player'),
                  viewType: 'native_video_view',
                  creationParams: {
                    'paths': videoPaths,
                    'initialIndex': initialIndex,
                  },
                  creationParamsCodec: const StandardMessageCodec(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStaticAdCard(String adSource) {
    String title = '';
    String subtitle = '';

    if (adSource.startsWith('static__')) {
      final parts = adSource.split('__');
      title = parts.length > 2 ? parts[2] : '';
      subtitle = parts.length > 3 ? parts[3] : '';
    } else {
      final fileName = adSource.split('/').last.split('\\').last;
      final bookingId = fileName.replaceAll('ad_', '').split('.').first;
      final adMap = adCampaigns.firstWhere(
        (ad) => ad['bookingId'] == bookingId,
        orElse: () => <String, dynamic>{},
      );
      title = adMap['title'] as String? ?? 'SPONSORED ADVERTISEMENT';
      subtitle = adMap['subtitle'] as String? ?? adMap['description'] as String? ?? '';
    }

    return Container(
      color: kScaffoldBg,
      child: Padding(
        padding: kCatalogPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.play_circle_fill_rounded, size: 80, color: Colors.blueAccent),
            const SizedBox(height: 20),
            Text("DEVICE IN SESSION: $deviceId", style: kAdDeviceIdStyle),
            const SizedBox(height: 10),
            Text(title, style: kAdTitleStyle, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(subtitle, style: kAdSubtitleStyle, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
