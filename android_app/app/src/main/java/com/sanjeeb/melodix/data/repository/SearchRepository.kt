package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SearchRepository(private val api: ApiService) {
    suspend fun searchSongs(query: String): List<Song> = withContext(Dispatchers.IO) {
        val raw = api.search(query, "song")
        if (raw.trim().startsWith("[")) JSONArray(raw).toSongList() else JSONObject(raw).optJSONArray("items").toSongList()
    }
}
