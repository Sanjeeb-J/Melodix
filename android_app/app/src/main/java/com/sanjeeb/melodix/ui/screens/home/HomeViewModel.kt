package com.sanjeeb.melodix.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sanjeeb.melodix.data.model.Playlist
import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.data.repository.HistoryRepository
import com.sanjeeb.melodix.data.repository.PlaylistRepository
import com.sanjeeb.melodix.data.repository.RecommendRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val loading: Boolean = false,
    val playlists: List<Playlist> = emptyList(),
    val recommendations: List<Song> = emptyList(),
    val recentHistory: List<Song> = emptyList(),
    val error: String? = null,
)

class HomeViewModel(
    private val playlistRepository: PlaylistRepository,
    private val recommendRepository: RecommendRepository,
    private val historyRepository: HistoryRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(HomeUiState())
    val state = _state.asStateFlow()

    fun loadAll() = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            _state.value = HomeUiState(
                playlists = playlistRepository.getPlaylists(),
                recommendations = recommendRepository.getRecommendations(),
                recentHistory = historyRepository.getHistory(6),
            )
        } catch (error: Exception) {
            _state.value = _state.value.copy(loading = false, error = error.message)
        }
    }
}
