package com.sanjeeb.melodix.data.model

data class Song(
    val id: String = "",
    val videoId: String = "",
    val youtubeId: String = "",
    val title: String = "",
    val name: String = "",
    val artist: String = "",
    val album: String = "",
    val thumbnail: String = "",
    val duration: String = "",
    val durationSeconds: Int = 0,
    val youtubeLink: String = "",
) {
    val displayTitle: String get() = title.ifBlank { name.ifBlank { "Untitled" } }
    val streamId: String get() = videoId.ifBlank { youtubeId }
}
