package com.sanjeeb.melodix.data.model

data class Playlist(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val coverColor: String = "#1DB954",
    val isPublic: Boolean = false,
    val totalDuration: Int = 0,
    val songs: List<Song> = emptyList(),
)
