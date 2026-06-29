package com.sanjeeb.melodix.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.sanjeeb.melodix.di.AppModule
import com.sanjeeb.melodix.ui.screens.auth.AuthScreen
import com.sanjeeb.melodix.ui.screens.home.HomeScreen
import com.sanjeeb.melodix.ui.screens.search.SearchScreen
import com.sanjeeb.melodix.ui.screens.library.LibraryScreen
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import com.sanjeeb.melodix.ui.components.BottomNavBar
import com.sanjeeb.melodix.ui.components.MiniPlayer
import com.sanjeeb.melodix.ui.screens.likedsongs.LikedSongsScreen
import com.sanjeeb.melodix.ui.screens.player.NowPlayingScreen
import com.sanjeeb.melodix.ui.screens.playlist.PlaylistScreen
import com.sanjeeb.melodix.ui.screens.artist.ArtistScreen

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val token = AppModule.prefsManager.getToken()
    val startDestination = if (token.isNullOrBlank()) "auth" else "home"

    val currentBackStack by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStack?.destination?.route

    val showBottomBarAndPlayer = currentRoute != "auth" && currentRoute != "now_playing"

    Scaffold(
        bottomBar = {
            if (showBottomBarAndPlayer) {
                androidx.compose.foundation.layout.Column {
                    MiniPlayer(
                        player = AppModule.melodixPlayer,
                        onNavigateToNowPlaying = { navController.navigate("now_playing") }
                    )
                    BottomNavBar(navController = navController, currentRoute = currentRoute)
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            NavHost(navController = navController, startDestination = startDestination) {
                composable("auth") {
                    AuthScreen(
                        onAuthSuccess = {
                            navController.navigate("home") {
                                popUpTo("auth") { inclusive = true }
                            }
                        }
                    )
                }
                composable("home") {
                    val viewModel: com.sanjeeb.melodix.ui.screens.home.HomeViewModel = androidx.lifecycle.viewmodel.compose.viewModel(factory = com.sanjeeb.melodix.di.ViewModelFactory)
                    val state by viewModel.state.collectAsState()
                    LaunchedEffect(Unit) { viewModel.loadAll() }
                    HomeScreen(
                        state = state,
                        onPlay = { song -> AppModule.melodixPlayer.play(song) }
                    )
                }
                composable("search") {
                    val viewModel: com.sanjeeb.melodix.ui.screens.search.SearchViewModel = androidx.lifecycle.viewmodel.compose.viewModel(factory = com.sanjeeb.melodix.di.ViewModelFactory)
                    // Assume SearchScreen takes viewModel or state
                    SearchScreen(navController = navController)
                }
                composable("library") {
                    val viewModel: com.sanjeeb.melodix.ui.screens.library.LibraryViewModel = androidx.lifecycle.viewmodel.compose.viewModel(factory = com.sanjeeb.melodix.di.ViewModelFactory)
                    val state by viewModel.state.collectAsState()
                    LaunchedEffect(Unit) { viewModel.loadPlaylists() }
                    LibraryScreen(
                        state = state,
                        onOpenPlaylist = { id -> navController.navigate("playlist/$id") }
                    )
                }
                composable("liked") {
                    LikedSongsScreen(navController = navController)
                }
                composable("now_playing") {
                    val viewModel: com.sanjeeb.melodix.ui.screens.player.NowPlayingViewModel = androidx.lifecycle.viewmodel.compose.viewModel(factory = com.sanjeeb.melodix.di.ViewModelFactory)
                    NowPlayingScreen(
                        player = AppModule.melodixPlayer,
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("playlist/{id}") { backStackEntry ->
                    val id = backStackEntry.arguments?.getString("id") ?: ""
                    val viewModel: com.sanjeeb.melodix.ui.screens.playlist.PlaylistViewModel = androidx.lifecycle.viewmodel.compose.viewModel(factory = com.sanjeeb.melodix.di.ViewModelFactory)
                    PlaylistScreen(navController = navController, playlistId = id)
                }
                composable("artist/{id}") { backStackEntry ->
                    val id = backStackEntry.arguments?.getString("id") ?: ""
                    ArtistScreen(navController = navController, artistId = id)
                }
            }
        }
    }
}
