package com.example.tabletop_ordering_app

import android.content.Context
import android.net.Uri
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

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.tabletop_ordering_app/performance"
    private val VIDEO_CHANNEL = "com.example.tabletop_ordering_app/native_video"
    private var methodChannel: MethodChannel? = null

    companion object {
        var activeVideoView: NativeVideoView? = null
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Boost the Flutter UI thread to display priority
        Process.setThreadPriority(Process.THREAD_PRIORITY_DISPLAY)

        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VIDEO_CHANNEL)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getThreadPriority" -> {
                    result.success(Process.getThreadPriority(Process.myTid()))
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
                    activeVideoView?.setPlaylist(paths)
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
}

class NativeVideoView(
    context: Context,
    id: Int,
    creationParams: Map<String, Any?>?,
    private val methodChannel: MethodChannel?
) : PlatformView, FrameLayout(context) {

    private val playerA = VideoView(context)
    private val playerB = VideoView(context)

    private var playlist: List<String> = emptyList()
    private var currentIndex = 0
    private var activePlayerIndex = 0 // 0 for playerA, 1 for playerB
    private var isPlaying = true

    init {
        MainActivity.activeVideoView = this

        val params = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        playerA.layoutParams = params
        playerB.layoutParams = params

        playerA.setZOrderMediaOverlay(true)
        playerA.isClickable = false
        playerA.isFocusable = false
        playerA.isFocusableInTouchMode = false

        playerB.setZOrderMediaOverlay(true)
        playerB.isClickable = false
        playerB.isFocusable = false
        playerB.isFocusableInTouchMode = false

        addView(playerA)
        addView(playerB)

        playerA.visibility = View.VISIBLE
        playerB.visibility = View.GONE

        val paths = creationParams?.get("paths") as? List<String> ?: emptyList()
        if (paths.isNotEmpty()) {
            setPlaylist(paths)
        }
    }

    override fun getView(): View {
        return this
    }

    fun setPlaylist(paths: List<String>) {
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
            preloadNext()
        } else {
            currentIndex = 0
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
            preloadNext()
        }
    }

    fun pause() {
        isPlaying = false
        playerA.pause()
        playerB.pause()
    }

    private fun getActivePlayer(): VideoView = if (activePlayerIndex == 0) playerA else playerB
    private fun getBackgroundPlayer(): VideoView = if (activePlayerIndex == 0) playerB else playerA

    private fun playCurrent() {
        if (playlist.isEmpty() || currentIndex < 0 || currentIndex >= playlist.size) return

        val path = playlist[currentIndex]
        val activePlayer = getActivePlayer()
        val bgPlayer = getBackgroundPlayer()

        activePlayer.visibility = View.VISIBLE
        bgPlayer.visibility = View.GONE

        val uri = Uri.parse(path)
        activePlayer.setVideoURI(uri)

        activePlayer.setOnPreparedListener { mp ->
            mp.isLooping = false
            if (isPlaying) {
                activePlayer.start()
                preloadNext()
            }
        }

        activePlayer.setOnCompletionListener {
            methodChannel?.invokeMethod("onVideoComplete", mapOf("path" to playlist[currentIndex]))
            if (isPlaying) {
                swapPlayers()
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
        if (playlist.isEmpty()) return
        val nextIndex = (currentIndex + 1) % playlist.size
        val nextPath = playlist[nextIndex]
        val bgPlayer = getBackgroundPlayer()

        bgPlayer.setVideoURI(Uri.parse(nextPath))
        bgPlayer.setOnPreparedListener { mp ->
            mp.isLooping = false
        }
    }

    private fun swapPlayers() {
        val activePlayer = getActivePlayer()
        val bgPlayer = getBackgroundPlayer()

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
        playerB.stopPlayback()
        playerA.visibility = View.VISIBLE
        playerB.visibility = View.GONE
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
