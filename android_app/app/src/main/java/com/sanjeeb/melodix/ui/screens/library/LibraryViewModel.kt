package com.sanjeeb.melodix.ui.screens.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sanjeeb.melodix.data.model.Playlist
import com.sanjeeb.melodix.data.repository.PlaylistRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LibraryUiState(val loading: Boolean = false, val playlists: List<Playlist> = emptyList(), val error: String? = null)

class LibraryViewModel(private val playlistRepository: PlaylistRepository) : ViewModel() {
    private val _state = MutableStateFlow(LibraryUiState())
    val state = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            _state.value = LibraryUiState(playlists = playlistRepository.getPlaylists())
        } catch (error: Exception) {
            _state.value = _state.value.copy(loading = false, error = error.message)
        }
    }
}
