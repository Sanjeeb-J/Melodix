package com.sanjeeb.melodix.ui.screens.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sanjeeb.melodix.ui.theme.SpotifyGreen

@Composable
fun NowPlayingScreen(state: NowPlayingUiState, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(state.song?.displayTitle ?: "Nothing playing", fontSize = 28.sp, fontWeight = FontWeight.Black)
        Text(state.song?.artist.orEmpty())
        LinearProgressIndicator(progress = { state.progress }, color = SpotifyGreen)
    }
}
