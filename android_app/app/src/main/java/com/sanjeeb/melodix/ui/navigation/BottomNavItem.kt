package com.sanjeeb.melodix.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(val route: String, val label: String, val icon: ImageVector) {
    data object Home : BottomNavItem("home", "Home", Icons.Default.Home)
    data object Search : BottomNavItem("search", "Search", Icons.Default.Search)
    data object Library : BottomNavItem("library", "Library", Icons.Default.LibraryMusic)
}
