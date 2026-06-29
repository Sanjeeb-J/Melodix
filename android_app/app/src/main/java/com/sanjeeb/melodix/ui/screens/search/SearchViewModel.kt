package com.sanjeeb.melodix.ui.screens.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.data.repository.SearchRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    val loading: Boolean = false,
    val results: List<Song> = emptyList(),
    val error: String? = null,
)

class SearchViewModel(private val searchRepository: SearchRepository) : ViewModel() {
    private val _state = MutableStateFlow(SearchUiState())
    val state = _state.asStateFlow()

    fun setQuery(query: String) {
        _state.value = _state.value.copy(query = query)
    }

    fun search() = viewModelScope.launch {
        val query = _state.value.query.trim()
        if (query.isBlank()) return@launch
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            _state.value = _state.value.copy(loading = false, results = searchRepository.searchSongs(query))
        } catch (error: Exception) {
            _state.value = _state.value.copy(loading = false, error = error.message)
        }
    }
}
