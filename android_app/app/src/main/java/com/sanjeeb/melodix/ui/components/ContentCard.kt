package com.sanjeeb.melodix.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.sanjeeb.melodix.data.model.Song
import com.sanjeeb.melodix.ui.theme.SpotifySurface
import com.sanjeeb.melodix.ui.theme.SpotifyTextSecondary

@Composable
fun ContentCard(song: Song, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(SpotifySurface)
            .clickable(onClick = onClick)
            .padding(12.dp)
    ) {
        if (song.thumbnail.isNotBlank()) {
            AsyncImage(
                model = song.thumbnail,
                contentDescription = song.displayTitle,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(4.dp)),
            )
        } else {
            Icon(Icons.Default.MusicNote, contentDescription = null, modifier = Modifier.fillMaxWidth().aspectRatio(1f))
        }
        Text(song.displayTitle, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(song.artist, color = SpotifyTextSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}
