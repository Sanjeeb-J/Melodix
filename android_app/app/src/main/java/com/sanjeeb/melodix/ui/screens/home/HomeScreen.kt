package com.sanjeeb.melodix.ui.screens.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.lazy.LazyRow
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
import com.sanjeeb.melodix.ui.components.ContentCard
import com.sanjeeb.melodix.ui.components.TrackRow

@Composable
fun HomeScreen(state: HomeUiState, onPlay: (Song) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item { Text("Good evening", fontSize = 32.sp, fontWeight = FontWeight.Black) }
        if (state.recentHistory.isNotEmpty()) {
            item { Text("Recently played", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
            items(state.recentHistory) { song -> TrackRow(song = song, onClick = { onPlay(song) }) }
        }
        if (state.recommendations.isNotEmpty()) {
            item { Text("Made for you", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.recommendations) { song -> ContentCard(song = song, onClick = { onPlay(song) }) }
                }
            }
        }
    }
}
