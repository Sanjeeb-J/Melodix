package com.sanjeeb.melodix.ui.screens.likedsongs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.ui.components.TrackRow

@Composable
fun LikedSongsScreen(songs: List<Song>, onPlay: (Song) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Liked Songs", fontSize = 34.sp, fontWeight = FontWeight.Black)
            Text("${songs.size} songs")
        }
        items(songs) { song -> TrackRow(song = song, onClick = { onPlay(song) }) }
    }
}
