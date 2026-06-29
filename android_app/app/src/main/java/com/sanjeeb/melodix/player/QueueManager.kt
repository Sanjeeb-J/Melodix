package com.sanjeeb.melodix.player

import com.sanjeeb.melodix.data.model.Song
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class QueueManager {
    private val _queue = MutableStateFlow<List<Song>>(emptyList())
    val queue = _queue.asStateFlow()

    private val _index = MutableStateFlow(0)
    val index = _index.asStateFlow()

    fun setQueue(songs: List<Song>, startIndex: Int = 0) {
        _queue.value = songs
        _index.value = startIndex.coerceIn(songs.indices.takeIf { songs.isNotEmpty() } ?: 0..0)
    }

    fun current(): Song? = _queue.value.getOrNull(_index.value)

    fun next(): Song? {
        val songs = _queue.value
        if (songs.isEmpty()) return null
        _index.value = (_index.value + 1).coerceAtMost(songs.lastIndex)
        return current()
    }

    fun previous(): Song? {
        val songs = _queue.value
        if (songs.isEmpty()) return null
        _index.value = (_index.value - 1).coerceAtLeast(0)
        return current()
    }
}
