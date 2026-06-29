package com.sanjeeb.melodix.di

import android.content.Context
import com.sanjeeb.melodix.data.local.PrefsManager
import com.sanjeeb.melodix.data.remote.ApiService
import com.sanjeeb.melodix.data.remote.AuthInterceptor
import com.sanjeeb.melodix.data.repository.*
import com.sanjeeb.melodix.player.MelodixPlayer
import com.sanjeeb.melodix.player.QueueManager

object AppModule {
    lateinit var prefsManager: PrefsManager
        private set
    lateinit var apiService: ApiService
        private set
    lateinit var authRepository: AuthRepository
        private set
    lateinit var playlistRepository: PlaylistRepository
        private set
    lateinit var historyRepository: HistoryRepository
        private set
    lateinit var likedRepository: LikedRepository
        private set
    lateinit var recommendRepository: RecommendRepository
        private set
    lateinit var searchRepository: SearchRepository
        private set
    lateinit var youtubeRepository: YoutubeRepository
        private set
    lateinit var melodixPlayer: MelodixPlayer
        private set
    lateinit var queueManager: QueueManager
        private set

    fun init(context: Context) {
        prefsManager = PrefsManager(context)
        val authInterceptor = AuthInterceptor(prefsManager)
        val okHttpClient = ApiService.defaultClient(authInterceptor)
        apiService = ApiService(okHttpClient)
        
        authRepository = AuthRepository(apiService, prefsManager)
        playlistRepository = PlaylistRepository(apiService)
        historyRepository = HistoryRepository(apiService)
        likedRepository = LikedRepository(apiService)
        recommendRepository = RecommendRepository(apiService)
        searchRepository = SearchRepository(apiService)
        youtubeRepository = YoutubeRepository(apiService)
        
        queueManager = QueueManager()
        melodixPlayer = MelodixPlayer(context, queueManager)
    }
}
