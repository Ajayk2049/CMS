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
        if (state.playlist.isEmpty) return _buildWaitingView();

        final isStatic = state.currentSource.startsWith('static__');
        final isTransitioning = state.isTransitioning;
        final hasVideo = !isStatic && !isTransitioning && state.currentSource.isNotEmpty;

        if (hasVideo) return _buildVideoView(state.currentSource);
        if (isStatic) return _buildStaticAdCard(state.currentSource);

        return Container(color: Colors.black);
      },
    );
  }

  Widget _buildWaitingView() {
    return Container(
      color: Colors.black,
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.tv_off_rounded, size: 80, color: Colors.blueAccent),
            SizedBox(height: 20),
            Text("WAITING FOR AD CONTENT...", style: kAdWaitingTextStyle),
          ],
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
