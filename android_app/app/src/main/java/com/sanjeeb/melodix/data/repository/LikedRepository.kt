package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class LikedRepository(private val api: ApiService) {
    suspend fun getLikedSongs(): List<Song> = withContext(Dispatchers.IO) {
        JSONArray(api.getLikedSongs()).toSongList()
    }

    suspend fun like(song: Song): Unit = withContext(Dispatchers.IO) {
        val videoId = song.streamId
        if (videoId.isBlank()) return@withContext
        api.likeSong(
            videoId,
            JSONObject()
                .put("title", song.displayTitle)
                .put("artist", song.artist)
                .put("thumbnail", song.thumbnail)
                .put("duration", song.durationSeconds),
        )
    }

    suspend fun unlike(song: Song): Unit = withContext(Dispatchers.IO) {
        val videoId = song.streamId
        if (videoId.isNotBlank()) api.unlikeSong(videoId)
    }
}
