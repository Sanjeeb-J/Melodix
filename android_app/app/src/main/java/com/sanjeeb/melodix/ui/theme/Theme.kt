package com.sanjeeb.melodix.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val MelodixColors = darkColorScheme(
    primary = SpotifyGreen,
    background = SpotifyBackground,
    surface = SpotifySurface,
    surfaceVariant = SpotifySurfaceHover,
    error = SpotifyError,
    onPrimary = SpotifyBlack,
    onBackground = SpotifyWhite,
    onSurface = SpotifyWhite,
    onSurfaceVariant = SpotifyTextSecondary,
)

@Composable
fun MelodixSpotifyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MelodixColors,
        typography = MelodixTypography,
        content = content,
    )
}
