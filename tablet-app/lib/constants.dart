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

const Color kScaffoldBg = Color(0xFFE4DFEB); // Lavender/grey/cream background
const Color kCardBg = Color(0xFFFFFFFF); // Pure white card background
const Color kAccentBlue = Color(0xFF56A4E1); // Accent blue color
const Color kSidebarBg = Color(0xFFDCD7E3); // Slightly darker tone for sidebar
const Color kTextDark = Color(0xFF1E1B4B); // Dark indigo for text
const Color kTextGrey = Color(0xFF64748B); // Slate gray for descriptions
const Color kDividerColor = Color(0xFFCBD5E1); // Slate gray divider

// ───────────────────────── EdgeInsets (const, zero allocation) ─────────────────────────

const EdgeInsets kCardPadding = EdgeInsets.all(16.0);
const EdgeInsets kCatalogPadding = EdgeInsets.all(24.0);
const EdgeInsets kSetupCardPadding = EdgeInsets.all(32.0);
const EdgeInsets kCategoryLabelPadding = EdgeInsets.symmetric(vertical: 12.0);
const EdgeInsets kGradientOverlayPadding = EdgeInsets.fromLTRB(16, 24, 16, 16);
const EdgeInsets kCheckoutTotalPadding = EdgeInsets.symmetric(vertical: 12.0);
const EdgeInsets kFloatingCartPadding = EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0);

// ───────────────────────── TextStyles (const, zero allocation) ─────────────────────────

const TextStyle kCardTitleStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kCardDescriptionStyle = TextStyle(
  fontSize: 11,
  color: kTextGrey,
);

const TextStyle kCardPriceStyle = TextStyle(
  fontSize: 15,
  fontWeight: FontWeight.w900,
  color: kAccentBlue,
);

const TextStyle kCategoryHeaderStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kCartButtonTextStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: kAccentBlue,
  fontSize: 12,
);

const TextStyle kQuantityTextStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: kAccentBlue,
  fontSize: 14,
);

const TextStyle kOrderHeaderStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 24,
  color: kTextDark,
);

const TextStyle kOrderItemTitleStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kOrderItemSubtitleStyle = TextStyle(
  color: kTextGrey,
  fontSize: 12,
);

const TextStyle kTotalLabelStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kTotalValueStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.w900,
  color: kAccentBlue,
);

const TextStyle kSetupTitleStyle = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  letterSpacing: 0.5,
  color: kTextDark,
);

const TextStyle kSetupSubtitleStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
);

const TextStyle kErrorTextStyle = TextStyle(
  color: Colors.redAccent,
  fontSize: 12,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdWaitingTextStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextGrey,
);

const TextStyle kAdDeviceIdStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdSponsoredStyle = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.bold,
  letterSpacing: 2,
  color: kAccentBlue,
);

const TextStyle kAdTitleStyle = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kAdSubtitleStyle = TextStyle(
  fontSize: 14,
  color: kTextGrey,
);

const TextStyle kFloatingCartItemsStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 16,
  color: Colors.white,
);

const TextStyle kFloatingCartTotalStyle = TextStyle(
  fontWeight: FontWeight.w900,
  fontSize: 18,
  color: Colors.white,
);

const TextStyle kCheckoutTitleStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kCheckoutQRTitleStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 16,
  color: kTextDark,
);

const TextStyle kCheckoutOrderIdStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
);

const TextStyle kCheckoutWaitingStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
);

const TextStyle kEmptyCartStyle = TextStyle(
  color: kTextGrey,
);

// ───────────────────────── Decorations ─────────────────────────

const BorderRadius kCardBorderRadius = BorderRadius.all(Radius.circular(24));
const BorderRadius kImageBorderRadius = BorderRadius.all(Radius.circular(18));
const BorderRadius kInputBorderRadius = BorderRadius.all(Radius.circular(16));
const BorderRadius kFloatingCartBorderRadius = BorderRadius.all(Radius.circular(32));

// ───────────────────────── Grid Delegates ─────────────────────────

const SliverGridDelegateWithFixedCrossAxisCount kMenuGridDelegate =
    SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: 2,
  crossAxisSpacing: 20,
  mainAxisSpacing: 20,
  childAspectRatio: 0.85, // Moderately taller cards to hold bottom stepper/layout cleanly
);

// ───────────────────────── Storage ─────────────────────────

const String kAdsDirectoryPath = '/sdcard/AIBotInk/ads_tablet';
const String kPlaylistCacheKey = 'local_playlist';
const String kLastSyncTimeKey = 'last_sync_time';

// ───────────────────────── Video layout ─────────────────────────

/// Extra pixels added to the video container to push the hardware decoder
/// green stripe off-screen for Rockchip/Mali budget tablets.
const double kVideoOverflowPx = 80.0;
