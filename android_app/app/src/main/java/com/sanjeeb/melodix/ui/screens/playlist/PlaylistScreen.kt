package com.sanjeeb.melodix.ui.screens.playlist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.ui.components.TrackRow

@Composable
fun PlaylistScreen(state: PlaylistUiState, onPlay: (Song) -> Unit, modifier: Modifier = Modifier) {
    val playlist = state.playlist
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(playlist?.name ?: "Playlist", fontSize = 34.sp, fontWeight = FontWeight.Black)
            if (!playlist?.description.isNullOrBlank()) Text(playlist?.description.orEmpty())
        }
        itemsIndexed(playlist?.songs.orEmpty()) { _, song -> TrackRow(song = song, onClick = { onPlay(song) }) }
    }
}
