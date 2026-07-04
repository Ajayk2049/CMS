package com.example.tabletop_ordering_app

import android.content.Context
import android.net.Uri
import android.os.Process
import android.view.View
import android.widget.VideoView
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
    }
}

class NativeVideoView(
    context: Context,
    id: Int,
    creationParams: Map<String, Any?>?,
    private val methodChannel: MethodChannel?
) : PlatformView {
    private val videoView = VideoView(context)

    init {
        // Render in overlay mode to play nicely with Flutter compositing
        videoView.setZOrderMediaOverlay(true)
        videoView.isClickable = false
        videoView.isFocusable = false
        videoView.isFocusableInTouchMode = false
        
        val path = creationParams?.get("path") as? String
        val looping = creationParams?.get("looping") as? Boolean ?: false

        if (path != null) {
            val uri = Uri.parse(path)
            videoView.setVideoURI(uri)
            videoView.setOnPreparedListener { mp ->
                mp.isLooping = looping
                videoView.start()
            }
            videoView.setOnCompletionListener {
                methodChannel?.invokeMethod("onVideoComplete", mapOf("path" to path))
            }
            videoView.setOnErrorListener { _, what, extra ->
                methodChannel?.invokeMethod("onVideoError", mapOf("path" to path, "error" to "what=$what extra=$extra"))
                true
            }
        }
    }

    override fun getView(): View {
        return videoView
    }

    override fun dispose() {
        videoView.stopPlayback()
    }
}

class NativeVideoViewFactory(private val methodChannel: MethodChannel?) :
    PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, id: Int, args: Any?): PlatformView {
        val creationParams = args as? Map<String, Any?>
        return NativeVideoView(context, id, creationParams, methodChannel)
    }
}
