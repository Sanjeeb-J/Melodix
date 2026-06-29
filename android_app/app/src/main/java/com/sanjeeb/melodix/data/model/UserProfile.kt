package com.sanjeeb.melodix.data.model

data class UserProfile(
    val id: String = "",
    val email: String = "",
    val name: String = "",
    val displayName: String = "",
    val avatarColor: String = "#1DB954",
    val totalPlays: Int = 0,
    val totalMinutes: Int = 0,
    val playlistCount: Int = 0,
)
