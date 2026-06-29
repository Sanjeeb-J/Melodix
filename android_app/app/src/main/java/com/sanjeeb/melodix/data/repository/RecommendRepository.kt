package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class RecommendRepository(private val api: ApiService) {
    suspend fun getRecommendations(): List<Song> = withContext(Dispatchers.IO) {
        JSONObject(api.getRecommendations()).optJSONArray("items").toSongList()
    }
}
