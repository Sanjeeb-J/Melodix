package com.sanjeeb.melodix.ui.screens.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun LibraryScreen(state: LibraryUiState, onOpenPlaylist: (String) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { Text("Your Library", fontSize = 30.sp, fontWeight = FontWeight.Black) }
        items(state.playlists) { playlist ->
            Column(Modifier.clickable { onOpenPlaylist(playlist.id) }) {
                Text(playlist.name, fontWeight = FontWeight.Bold)
                Text("${playlist.songs.size} songs")
            }
        }
    }
}
