package com.sanjeeb.melodix.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.sanjeeb.melodix.BuildConfig
import com.sanjeeb.melodix.data.model.Song
import java.net.URLEncoder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MelodixPlayer(context: Context) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val player = ExoPlayer.Builder(context.applicationContext).build()

    private val _currentSong = MutableStateFlow<Song?>(null)
    val currentSong = _currentSong.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying = _isPlaying.asStateFlow()

    private val _progress = MutableStateFlow(0f)
    val progress = _progress.asStateFlow()

    init {
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _isPlaying.value = isPlaying
            }
        })
        scope.launch {
            while (true) {
                val duration = player.duration.takeIf { it > 0 } ?: 0
                _progress.value = if (duration == 0L) 0f else (player.currentPosition.toFloat() / duration).coerceIn(0f, 1f)
                delay(500)
            }
        }
    }

    fun play(song: Song, token: String) {
        val videoId = song.streamId
        if (videoId.isBlank()) return
        val url = "${BuildConfig.BACKEND_URL}/api/stream/${videoId.enc()}?token=${token.enc()}"
        _currentSong.value = song
        player.setMediaItem(MediaItem.fromUri(url))
        player.prepare()
        player.play()
    }

    fun toggle() {
        if (player.isPlaying) player.pause() else player.play()
    }

    fun release() {
        player.release()
    }

    private fun String.enc(): String = URLEncoder.encode(this, Charsets.UTF_8.name())
}
