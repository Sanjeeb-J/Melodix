package com.sanjeeb.melodix.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import com.sanjeeb.melodix.ui.theme.SpotifyGreen
import com.sanjeeb.melodix.ui.theme.SpotifyTextSecondary

@Composable
fun LikeButton(liked: Boolean, onClick: () -> Unit) {
    IconButton(onClick = onClick) {
        Icon(
            imageVector = if (liked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
            contentDescription = "Like",
            tint = if (liked) SpotifyGreen else SpotifyTextSecondary,
        )
    }
}
