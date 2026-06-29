package com.sanjeeb.melodix.di

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.sanjeeb.melodix.ui.screens.home.HomeViewModel
import com.sanjeeb.melodix.ui.screens.library.LibraryViewModel
import com.sanjeeb.melodix.ui.screens.playlist.PlaylistViewModel
import com.sanjeeb.melodix.ui.screens.search.SearchViewModel
import com.sanjeeb.melodix.ui.screens.player.NowPlayingViewModel

object ViewModelFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(HomeViewModel::class.java) -> {
                HomeViewModel(
                    AppModule.playlistRepository,
                    AppModule.recommendRepository,
                    AppModule.historyRepository
                ) as T
            }
            modelClass.isAssignableFrom(LibraryViewModel::class.java) -> {
                LibraryViewModel(
                    AppModule.playlistRepository
                ) as T
            }
            modelClass.isAssignableFrom(PlaylistViewModel::class.java) -> {
                PlaylistViewModel(
                    AppModule.playlistRepository
                ) as T
            }
            modelClass.isAssignableFrom(SearchViewModel::class.java) -> {
                SearchViewModel(
                    AppModule.searchRepository
                ) as T
            }
            modelClass.isAssignableFrom(NowPlayingViewModel::class.java) -> {
                NowPlayingViewModel(
                    AppModule.melodixPlayer,
                    AppModule.likedRepository
                ) as T
            }
            else -> throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
