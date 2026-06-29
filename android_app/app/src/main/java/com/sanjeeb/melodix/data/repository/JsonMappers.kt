package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.model.Playlist
import com.sanjeeb.melodix.data.model.Song
import org.json.JSONArray
import org.json.JSONObject

internal fun JSONObject.toSong(): Song = Song(
    id = optString("_id"),
    videoId = optString("videoId"),
    youtubeId = optString("youtubeId"),
    title = optString("title"),
    name = optString("name"),
    artist = optString("artist"),
    album = optString("album"),
    thumbnail = optString("thumbnail"),
    duration = optString("duration"),
    durationSeconds = optInt("durationSeconds", optInt("duration", 0)),
    youtubeLink = optString("youtubeLink"),
)

internal fun JSONObject.toPlaylist(): Playlist = Playlist(
    id = optString("_id"),
    name = optString("name"),
    description = optString("description"),
    coverColor = optString("coverColor", "#1DB954"),
    isPublic = optBoolean("isPublic", false),
    totalDuration = optInt("totalDuration", 0),
    songs = optJSONArray("songs").toSongList(),
)

internal fun JSONArray?.toSongList(): List<Song> {
    val array = this ?: return emptyList()
    return (0 until array.length()).mapNotNull { array.optJSONObject(it)?.toSong() }
}

internal fun JSONArray?.toPlaylistList(): List<Playlist> {
    val array = this ?: return emptyList()
    return (0 until array.length()).mapNotNull { array.optJSONObject(it)?.toPlaylist() }
}
