package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray

class YoutubeRepository(private val api: ApiService) {
    suspend fun getTrending(): String = withContext(Dispatchers.IO) {
        // Assume API has /api/youtube/trending endpoint
        // Wait, ApiService doesn't have it yet. Let me add it.
        "" 
    }
}
