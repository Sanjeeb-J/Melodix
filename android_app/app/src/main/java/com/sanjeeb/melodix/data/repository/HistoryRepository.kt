package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class HistoryRepository(private val api: ApiService) {
    suspend fun getHistory(limit: Int = 50): List<Song> = withContext(Dispatchers.IO) {
        JSONArray(api.getHistory(limit)).toSongList()
    }

    suspend fun logPlay(song: Song): Unit = withContext(Dispatchers.IO) {
        val videoId = song.streamId
        if (videoId.isBlank()) return@withContext
        api.logPlay(
            JSONObject()
                .put("videoId", videoId)
                .put("title", song.displayTitle)
                .put("artist", song.artist)
                .put("thumbnail", song.thumbnail)
                .put("duration", song.durationSeconds),
        )
    }
}
