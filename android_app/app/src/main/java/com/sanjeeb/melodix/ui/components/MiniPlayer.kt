package com.sanjeeb.melodix.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.ui.theme.SpotifyGreen

@Composable
fun MiniPlayer(song: Song?, isPlaying: Boolean, progress: Float, onTogglePlay: () -> Unit, modifier: Modifier = Modifier) {
    if (song == null) return
    Column(modifier.fillMaxWidth()) {
        LinearProgressIndicator(progress = { progress }, color = SpotifyGreen, modifier = Modifier.fillMaxWidth())
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(song.displayTitle, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onTogglePlay) {
                Icon(if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, contentDescription = "Play")
            }
        }
    }
}
