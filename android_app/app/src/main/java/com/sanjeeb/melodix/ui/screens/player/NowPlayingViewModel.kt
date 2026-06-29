package com.sanjeeb.melodix.ui.screens.player

import androidx.lifecycle.ViewModel
import com.sanjeeb.melodix.data.model.Song
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class NowPlayingUiState(val song: Song? = null, val isPlaying: Boolean = false, val progress: Float = 0f)

class NowPlayingViewModel : ViewModel() {
    private val _state = MutableStateFlow(NowPlayingUiState())
    val state = _state.asStateFlow()

    fun update(song: Song?, isPlaying: Boolean, progress: Float) {
        _state.value = NowPlayingUiState(song, isPlaying, progress)
    }
}
