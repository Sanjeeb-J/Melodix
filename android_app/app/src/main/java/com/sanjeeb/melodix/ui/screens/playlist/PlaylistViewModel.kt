package com.sanjeeb.melodix.ui.screens.playlist

import androidx.lifecycle.ViewModel
import com.sanjeeb.melodix.data.model.Playlist
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PlaylistUiState(val playlist: Playlist? = null, val loading: Boolean = false, val error: String? = null)

class PlaylistViewModel : ViewModel() {
    private val _state = MutableStateFlow(PlaylistUiState())
    val state = _state.asStateFlow()

    fun setPlaylist(playlist: Playlist) {
        _state.value = PlaylistUiState(playlist = playlist)
    }
}
