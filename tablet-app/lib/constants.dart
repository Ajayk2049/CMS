/// Static constants for the Kiosk Tablet App.
///
/// Every value here was previously instantiated inline inside build methods,
/// generating short-lived heap objects on every frame. Moving them to top-level
/// constants eliminates those allocations entirely and reduces GC pressure.
library;

import 'package:flutter/material.dart';

// ───────────────────────── Durations ─────────────────────────

/// Heartbeat ping interval to the gRPC server.
const Duration kHeartbeatInterval = Duration(seconds: 15);

/// Background ad sync interval after a successful first sync.
const Duration kSyncInterval = Duration(minutes: 2);

/// Retry delay for ad sync when the server is unreachable.
const Duration kSyncRetryDelay = Duration(seconds: 10);

/// How long a static (non-video) ad card is displayed.
const Duration kStaticAdDisplayDuration = Duration(seconds: 8);

/// Dip-to-black duration between video transitions.
const Duration kFadeDuration = Duration(milliseconds: 200);

/// Brief black gap between videos while the next controller initializes.
const Duration kTransitionBlackDuration = Duration(milliseconds: 350);

/// Inactivity timeout before the kiosk returns to ad slideshow.
const Duration kInactivityTimeout = Duration(seconds: 180);

/// Position poll frequency for video completion detection.
const Duration kPositionPollInterval = Duration(milliseconds: 500);

/// Watchdog interval to detect stalled video decoders.
const Duration kWatchdogInterval = Duration(seconds: 1);

/// How many consecutive watchdog stalls before force-advancing.
const int kWatchdogStallThreshold = 5;

/// Tolerance window for detecting video completion (ms before end).
const Duration kVideoEndTolerance = Duration(milliseconds: 500);

/// Payment status polling interval during checkout.
const Duration kPaymentPollInterval = Duration(seconds: 3);

/// HTTP request timeout for activation and sync calls.
const Duration kHttpTimeout = Duration(seconds: 10);

/// Video download timeout.
const Duration kDownloadTimeout = Duration(minutes: 5);

/// Max download retries per ad file.
const int kMaxDownloadRetries = 3;

/// Max consecutive boot sync retries before giving up and scheduling background retries.
const int kBootSyncRetries = 3;

/// Delay between boot sync retry attempts.
const Duration kBootSyncRetryDelay = Duration(seconds: 5);

/// Aggressive retry interval when the server was unreachable during boot.
const Duration kBootAggressiveRetryInterval = Duration(seconds: 30);

/// Minimum file size (bytes) to consider a download valid.
const int kMinValidFileSize = 1000;

/// Theme check interval.
const Duration kThemeCheckInterval = Duration(minutes: 5);

// ───────────────────────── Colors ─────────────────────────

const Color kScaffoldDarkBg = Color(0xFF0B0F19);
const Color kCardDark = Color(0xFF1E293B);
const Color kSlateLight = Color(0xFFF8FAFC);
const Color kSlate400 = Color(0xFF94A3B8);
const Color kSlate500 = Color(0xFF64748B);
const Color kDividerDark = Color(0xFF334155);

const Color kGradientDarkStart = Color(0xFF0F172A);
const Color kGradientDarkEnd = Color(0xFF1E1B4B);

// ───────────────────────── EdgeInsets (const, zero allocation) ─────────────────────────

const EdgeInsets kCardPadding = EdgeInsets.all(12.0);
const EdgeInsets kCatalogPadding = EdgeInsets.all(24.0);
const EdgeInsets kSetupCardPadding = EdgeInsets.all(32.0);
const EdgeInsets kCategoryLabelPadding = EdgeInsets.symmetric(vertical: 12.0);
const EdgeInsets kGradientOverlayPadding = EdgeInsets.fromLTRB(12, 24, 12, 12);
const EdgeInsets kCheckoutTotalPadding = EdgeInsets.symmetric(vertical: 12.0);
const EdgeInsets kFloatingCartPadding = EdgeInsets.symmetric(horizontal: 24.0);

// ───────────────────────── TextStyles (const, zero allocation) ─────────────────────────

const TextStyle kCardTitleStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: Colors.white,
);

const TextStyle kCardDescriptionStyle = TextStyle(
  fontSize: 11,
  color: Colors.white70,
);

const TextStyle kCardPriceStyle = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w900,
  color: Colors.blueAccent,
);

const TextStyle kCategoryHeaderStyle = TextStyle(
  fontSize: 18,
  fontWeight: FontWeight.bold,
  color: Colors.blueAccent,
);

const TextStyle kCartButtonTextStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: Colors.blueAccent,
  fontSize: 12,
);

const TextStyle kQuantityTextStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: Colors.blueAccent,
  fontSize: 14,
);

const TextStyle kOrderHeaderStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 20,
);

const TextStyle kOrderItemTitleStyle = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w600,
);

const TextStyle kOrderItemSubtitleStyle = TextStyle(
  color: kSlate400,
  fontSize: 12,
);

const TextStyle kTotalLabelStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
);

const TextStyle kTotalValueStyle = TextStyle(
  fontSize: 18,
  fontWeight: FontWeight.w900,
  color: Colors.blueAccent,
);

const TextStyle kSetupTitleStyle = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  letterSpacing: 0.5,
);

const TextStyle kSetupSubtitleStyle = TextStyle(
  fontSize: 12,
  color: kSlate400,
);

const TextStyle kErrorTextStyle = TextStyle(
  color: Colors.redAccent,
  fontSize: 12,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdWaitingTextStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: Colors.white70,
);

const TextStyle kAdDeviceIdStyle = TextStyle(
  fontSize: 12,
  color: kSlate400,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdSponsoredStyle = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.bold,
  letterSpacing: 2,
  color: Colors.blue,
);

const TextStyle kAdTitleStyle = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdSubtitleStyle = TextStyle(
  fontSize: 14,
  color: kSlate400,
);

const TextStyle kFloatingCartItemsStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 16,
);

const TextStyle kFloatingCartTotalStyle = TextStyle(
  fontWeight: FontWeight.w900,
  fontSize: 18,
);

const TextStyle kCheckoutTitleStyle = TextStyle(
  fontWeight: FontWeight.bold,
);

const TextStyle kCheckoutQRTitleStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 16,
);

const TextStyle kCheckoutOrderIdStyle = TextStyle(
  fontSize: 12,
  color: kSlate400,
);

const TextStyle kCheckoutWaitingStyle = TextStyle(
  fontSize: 12,
  color: kSlate400,
);

const TextStyle kEmptyCartStyle = TextStyle(
  color: kSlate500,
);

// ───────────────────────── Decorations ─────────────────────────

const BoxDecoration kDarkGradientBg = BoxDecoration(
  gradient: LinearGradient(
    colors: [kGradientDarkStart, kGradientDarkEnd],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  ),
);

const BorderRadius kCardBorderRadius = BorderRadius.all(Radius.circular(20));
const BorderRadius kImageBorderRadius = BorderRadius.all(Radius.circular(16));
const BorderRadius kInputBorderRadius = BorderRadius.all(Radius.circular(12));
const BorderRadius kFloatingCartBorderRadius = BorderRadius.all(Radius.circular(30));

// ───────────────────────── Grid Delegates ─────────────────────────

const SliverGridDelegateWithFixedCrossAxisCount kMenuGridDelegate =
    SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: 2,
  crossAxisSpacing: 16,
  mainAxisSpacing: 16,
  childAspectRatio: 0.7,
);

// ───────────────────────── Storage ─────────────────────────

const String kAdsDirectoryPath = '/sdcard/AIBotInk/ads_tablet';
const String kPlaylistCacheKey = 'local_playlist';
const String kLastSyncTimeKey = 'last_sync_time';

// ───────────────────────── Video layout ─────────────────────────

/// Extra pixels added to the video container to push the hardware decoder
/// green stripe off-screen for Rockchip/Mali budget tablets.
/// 80px was the confirmed working value per progress.md.
const double kVideoOverflowPx = 80.0;
