package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.model.Playlist
import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray

class PlaylistRepository(private val api: ApiService) {
    suspend fun getPlaylists(): List<Playlist> = withContext(Dispatchers.IO) {
        JSONArray(api.getPlaylists()).toPlaylistList()
    }
}
