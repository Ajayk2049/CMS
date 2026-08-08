package com.digiads.tabletop

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.view.View
import android.widget.VideoView
import android.widget.FrameLayout
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

class KioskAdminReceiver : DeviceAdminReceiver()

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON" ||
            intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
            val i = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(i)
        }
    }
}

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.digiads.tabletop/performance"
    private val VIDEO_CHANNEL = "com.digiads.tabletop/native_video"
    private var methodChannel: MethodChannel? = null
    private var kioskActive = true  // Lock Task is ON by default
    private var isCircuitBreakerTripped = false

    companion object {
        var activeVideoView: NativeVideoView? = null
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Boost the Flutter UI thread to display priority
        try {
            Process.setThreadPriority(Process.THREAD_PRIORITY_DISPLAY)
        } catch (e: Exception) {
            android.util.Log.w("DigiAdsKiosk", "Could not set thread priority: ${e.message}")
        }

        // Evaluate Circuit Breaker before enabling LockTask
        checkCircuitBreaker()

        if (!isCircuitBreakerTripped) {
            // Allowlist this app for Lock Task Mode on cold start
            enableDeviceOwnerPolicies()
        }

        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VIDEO_CHANNEL)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getThreadPriority" -> {
                    result.success(Process.getThreadPriority(Process.myTid()))
                }
                "isCircuitBreakerTripped" -> {
                    result.success(isCircuitBreakerTripped)
                }
                "resetCircuitBreaker" -> {
                    resetCircuitBreaker()
                    result.success(true)
                }
                "startKioskMode" -> {
                    try {
                        kioskActive = true
                        enableDeviceOwnerPolicies()
                        enterLockTask()
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("LOCK_TASK_ERROR", e.message, null)
                    }
                }
                "stopKioskMode" -> {
                    try {
                        kioskActive = false
                        stopLockTask()
                        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                        val adminComponent = ComponentName(this, KioskAdminReceiver::class.java)
                        if (dpm.isDeviceOwnerApp(packageName)) {
                            dpm.setStatusBarDisabled(adminComponent, false)
                        }
                        showSystemUI()
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("LOCK_TASK_ERROR", e.message, null)
                    }
                }
                "openAndroidSettings" -> {
                    try {
                        val intent = Intent(android.provider.Settings.ACTION_SETTINGS)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("SETTINGS_ERROR", e.message, null)
                    }
                }
                else -> result.notImplemented()
            }
        }

        flutterEngine.platformViewsController.registry.registerViewFactory(
            "native_video_view",
            NativeVideoViewFactory(methodChannel)
        )

        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "setPlaylist" -> {
                    val paths = call.argument<List<String>>("paths") ?: emptyList()
                    val index = call.argument<Int>("currentIndex") ?: 0
                    activeVideoView?.setPlaylist(paths, index)
                    result.success(null)
                }
                "play" -> {
                    activeVideoView?.play()
                    result.success(null)
                }
                "pause" -> {
                    activeVideoView?.pause()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun checkCircuitBreaker() {
        try {
            val prefs = getSharedPreferences("kiosk_guard", Context.MODE_PRIVATE)
            val launchTimesStr = prefs.getString("launch_timestamps", "") ?: ""
            val now = System.currentTimeMillis()
            val timestamps = launchTimesStr.split(",")
                .filter { it.isNotEmpty() }
                .mapNotNull { it.toLongOrNull() }
                .filter { now - it < 60000 }
                .toMutableList()

            timestamps.add(now)
            prefs.edit().putString("launch_timestamps", timestamps.joinToString(",")).apply()

            if (timestamps.size >= 4) {
                android.util.Log.e("DigiAdsKiosk", "🚨 CIRCUIT BREAKER TRIPPED! 4 launches in 60s. Suspending Kiosk LockTask to prevent boot loop.")
                isCircuitBreakerTripped = true
                kioskActive = false
            }
        } catch (e: Exception) {
            android.util.Log.e("DigiAdsKiosk", "Circuit breaker error: ${e.message}")
        }
    }

    private fun resetCircuitBreaker() {
        try {
            val prefs = getSharedPreferences("kiosk_guard", Context.MODE_PRIVATE)
            prefs.edit().remove("launch_timestamps").apply()
            isCircuitBreakerTripped = false
        } catch (e: Exception) {
            android.util.Log.e("DigiAdsKiosk", "Reset circuit breaker error: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        if (isCircuitBreakerTripped) {
            showSystemUI()
        } else {
            hideSystemUI()
            if (kioskActive) {
                enterLockTask()
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            if (isCircuitBreakerTripped) {
                showSystemUI()
            } else {
                hideSystemUI()
            }
        }
    }

    private fun enableDeviceOwnerPolicies() {
        try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(this, KioskAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setLockTaskPackages(adminComponent, arrayOf(packageName))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(adminComponent, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                }
                dpm.setStatusBarDisabled(adminComponent, true)
            }
        } catch (e: Exception) {
            android.util.Log.e("DigiAdsKiosk", "Device Owner policy setup failed: ${e.message}")
        }
    }

    private fun enterLockTask() {
        if (isCircuitBreakerTripped) return
        try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            if (dpm.isDeviceOwnerApp(packageName)) {
                if (!isInLockTaskMode()) {
                    startLockTask()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DigiAdsKiosk", "startLockTask failed: ${e.message}")
        }
    }

    private fun isInLockTaskMode(): Boolean {
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            activityManager.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE
        } else {
            @Suppress("DEPRECATION")
            activityManager.isInLockTaskMode
        }
    }

    private fun hideSystemUI() {
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(android.view.WindowInsets.Type.statusBars() or android.view.WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    private fun showSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
            window.insetsController?.show(android.view.WindowInsets.Type.statusBars() or android.view.WindowInsets.Type.navigationBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }
}

class NativeVideoView(
    context: Context,
    id: Int,
    creationParams: Map<String, Any?>?,
    private val methodChannel: MethodChannel?
) : PlatformView, FrameLayout(context) {

    private val isLegacyAndroid = Build.VERSION.SDK_INT <= Build.VERSION_CODES.O_MR1 // Android 8.1 or lower
    private val playerA = VideoView(context)
    private val playerB = if (!isLegacyAndroid) VideoView(context) else null

    private var playlist: List<String> = emptyList()
    private var currentIndex = 0
    private var activePlayerIndex = 0 // 0 for playerA, 1 for playerB
    private var isPlaying = true

    init {
        MainActivity.activeVideoView = this

        val params = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        playerA.layoutParams = params

        if (!isLegacyAndroid) {
            playerA.setZOrderMediaOverlay(true)
        }
        playerA.isClickable = false
        playerA.isFocusable = false
        playerA.isFocusableInTouchMode = false
        addView(playerA)
        playerA.visibility = View.VISIBLE

        if (playerB != null) {
            playerB.layoutParams = params
            playerB.setZOrderMediaOverlay(true)
            playerB.isClickable = false
            playerB.isFocusable = false
            playerB.isFocusableInTouchMode = false
            addView(playerB)
            playerB.visibility = View.GONE
        }

        val paths = creationParams?.get("paths") as? List<String> ?: emptyList()
        val initialIndex = creationParams?.get("initialIndex") as? Int ?: 0
        if (paths.isNotEmpty()) {
            setPlaylist(paths, initialIndex)
        }
    }

    override fun getView(): View {
        return this
    }

    fun setPlaylist(paths: List<String>, initialIndex: Int = 0) {
        val oldSource = if (playlist.isNotEmpty() && currentIndex >= 0 && currentIndex < playlist.size) {
            playlist[currentIndex]
        } else {
            null
        }

        playlist = paths

        if (playlist.isEmpty()) {
            stopAll()
            return
        }

        val newIndex = if (oldSource != null) playlist.indexOf(oldSource) else -1
        if (newIndex >= 0) {
            currentIndex = newIndex
            if (!isLegacyAndroid) preloadNext()
        } else {
            currentIndex = if (initialIndex >= 0 && initialIndex < playlist.size) initialIndex else 0
            if (isPlaying) {
                playCurrent()
            } else {
                preloadCurrentOnly()
            }
        }
    }

    fun play() {
        isPlaying = true
        val activePlayer = getActivePlayer()
        if (activePlayer.isPlaying) return

        if (activePlayer.duration <= 0) {
            playCurrent()
        } else {
            activePlayer.start()
            if (!isLegacyAndroid) preloadNext()
        }
    }

    fun pause() {
        isPlaying = false
        playerA.pause()
        playerB?.pause()
    }

    private fun getActivePlayer(): VideoView = if (activePlayerIndex == 0 || playerB == null) playerA else playerB
    private fun getBackgroundPlayer(): VideoView? = if (playerB == null) null else (if (activePlayerIndex == 0) playerB else playerA)

    private fun playCurrent() {
        if (playlist.isEmpty() || currentIndex < 0 || currentIndex >= playlist.size) return

        val path = playlist[currentIndex]
        val activePlayer = getActivePlayer()
        val bgPlayer = getBackgroundPlayer()

        activePlayer.visibility = View.VISIBLE
        bgPlayer?.visibility = View.GONE

        val uri = Uri.parse(path)
        activePlayer.setVideoURI(uri)

        activePlayer.setOnPreparedListener { mp ->
            mp.isLooping = false
            if (isPlaying) {
                activePlayer.start()
                if (!isLegacyAndroid) preloadNext()
            }
        }

        activePlayer.setOnCompletionListener {
            methodChannel?.invokeMethod("onVideoComplete", mapOf("path" to playlist[currentIndex]))
            if (isPlaying) {
                if (isLegacyAndroid || playerB == null) {
                    System.gc() // Trigger GC to clear memory buffers on 2GB RAM RK3326
                    advanceIndex()
                    playCurrent()
                } else {
                    swapPlayers()
                }
            }
        }

        activePlayer.setOnErrorListener { _, what, extra ->
            methodChannel?.invokeMethod("onVideoError", mapOf("path" to path, "error" to "what=$what extra=$extra"))
            if (isPlaying) {
                advanceIndex()
                playCurrent()
            }
            true
        }
    }

    private fun preloadCurrentOnly() {
        if (playlist.isEmpty() || currentIndex < 0 || currentIndex >= playlist.size) return
        val path = playlist[currentIndex]
        val activePlayer = getActivePlayer()
        activePlayer.setVideoURI(Uri.parse(path))
        activePlayer.setOnPreparedListener { mp ->
            mp.isLooping = false
        }
    }

    private fun preloadNext() {
        val bgPlayer = getBackgroundPlayer() ?: return
        if (playlist.isEmpty()) return
        val nextIndex = (currentIndex + 1) % playlist.size
        val nextPath = playlist[nextIndex]

        bgPlayer.setVideoURI(Uri.parse(nextPath))
        bgPlayer.setOnPreparedListener { mp ->
            mp.isLooping = false
        }
    }

    private fun swapPlayers() {
        val activePlayer = getActivePlayer()
        val bgPlayer = getBackgroundPlayer() ?: return

        bgPlayer.visibility = View.VISIBLE
        activePlayer.visibility = View.GONE

        bgPlayer.start()

        activePlayerIndex = 1 - activePlayerIndex
        currentIndex = (currentIndex + 1) % playlist.size

        val currentPath = playlist[currentIndex]
        bgPlayer.setOnCompletionListener {
            methodChannel?.invokeMethod("onVideoComplete", mapOf("path" to currentPath))
            if (isPlaying) {
                swapPlayers()
            }
        }
        bgPlayer.setOnErrorListener { _, what, extra ->
            methodChannel?.invokeMethod("onVideoError", mapOf("path" to currentPath, "error" to "what=$what extra=$extra"))
            if (isPlaying) {
                advanceIndex()
                playCurrent()
            }
            true
        }

        activePlayer.stopPlayback()
        preloadNext()
    }

    private fun advanceIndex() {
        if (playlist.isNotEmpty()) {
            currentIndex = (currentIndex + 1) % playlist.size
        }
    }

    private fun stopAll() {
        playerA.stopPlayback()
        playerB?.stopPlayback()
        playerA.visibility = View.VISIBLE
        playerB?.visibility = View.GONE
        activePlayerIndex = 0
        currentIndex = 0
    }

    override fun dispose() {
        stopAll()
        if (MainActivity.activeVideoView == this) {
            MainActivity.activeVideoView = null
        }
    }
}

class NativeVideoViewFactory(private val methodChannel: MethodChannel?) :
    PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, id: Int, args: Any?): PlatformView {
        val creationParams = args as? Map<String, Any?>
        return NativeVideoView(context, id, creationParams, methodChannel)
    }
}
