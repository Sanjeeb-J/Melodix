package com.sanjeeb.melodix

import android.app.Application
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.PlaylistPlay
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import coil.compose.rememberAsyncImagePainter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

private const val API_BASE_URL = "https://melodix-backend.onrender.com"
private const val PREFS = "melodix"
private const val TOKEN_KEY = "melodix_token"

data class Song(
    val id: String = "",
    val name: String = "",
    val title: String = "",
    val artist: String = "",
    val album: String = "",
    val duration: String = "",
    val youtubeId: String = "",
    val videoId: String = "",
    val youtubeLink: String = "",
    val thumbnail: String = ""
) {
    val displayName: String get() = name.ifBlank { title.ifBlank { "Unknown song" } }
    val streamId: String get() = youtubeId.ifBlank { videoId }
}

data class Playlist(val id: String, val name: String, val songs: List<Song> = emptyList())

data class MusicResult(
    val type: String = "song",
    val title: String = "",
    val name: String = "",
    val author: String = "",
    val artist: String = "",
    val subscribers: String = "",
    val thumbnail: String = "",
    val playlistId: String = "",
    val browseId: String = "",
    val videoId: String = "",
    val duration: String = "",
    val youtubeLink: String = ""
) {
    val label: String get() = title.ifBlank { name.ifBlank { "Untitled" } }
    val sublabel: String get() = author.ifBlank { artist.ifBlank { subscribers.ifBlank { "YouTube Music" } } }
    fun asSong() = Song(
        name = label,
        title = label,
        artist = sublabel,
        duration = duration,
        videoId = videoId,
        youtubeId = videoId,
        youtubeLink = youtubeLink,
        thumbnail = thumbnail
    )
}

data class UiState(
    val token: String? = null,
    val loading: Boolean = true,
    val busy: Boolean = false,
    val screen: Screen = Screen.Home,
    val playlists: List<Playlist> = emptyList(),
    val searchResults: List<MusicResult> = emptyList(),
    val query: String = "",
    val searchFilter: SearchFilter = SearchFilter.Songs,
    val selectedPlaylistId: String? = null,
    val toast: String? = null,
    val currentSong: Song? = null,
    val queue: List<Song> = emptyList(),
    val queueIndex: Int = 0,
    val isPlaying: Boolean = false,
    val playbackProgress: Float = 0f
)

enum class Screen { Auth, Home, Search, Library, Playlist }
enum class AuthMode { Login, Register, Forgot }
enum class SearchFilter(val id: String, val label: String, val icon: ImageVector) {
    Songs("songs", "Songs", Icons.Default.LibraryMusic),
    Playlists("playlists", "Playlists", Icons.AutoMirrored.Filled.PlaylistPlay),
    Albums("albums", "Albums", Icons.Default.Album),
    Artists("artists", "Artists", Icons.Default.Mic)
}

class MainActivity : ComponentActivity() {
    private val viewModel by viewModels<MelodixViewModel>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MelodixTheme {
                MelodixApp(viewModel)
            }
        }
    }
}

class MelodixViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = app.getSharedPreferences(PREFS, 0)
    private val api = MelodixApi { state.value.token }
    private val player = MelodixPlayer(app) { isPlaying, progress ->
        _state.update { it.copy(isPlaying = isPlaying, playbackProgress = progress) }
    }
    private val _state = MutableStateFlow(UiState())
    val state = _state.asStateFlow()

    init {
        val token = prefs.getString(TOKEN_KEY, null)
        _state.update { it.copy(token = token, loading = false, screen = if (token == null) Screen.Auth else Screen.Home) }
        if (token != null) refreshPlaylists()
        viewModelScope.launch {
            while (true) {
                player.tick()
                delay(500)
            }
        }
    }

    fun login(email: String, password: String) = runBusy {
        val token = api.login(email, password)
        prefs.edit().putString(TOKEN_KEY, token).apply()
        _state.update { it.copy(token = token, screen = Screen.Home, toast = "Welcome back") }
        refreshPlaylists()
    }

    fun register(name: String, email: String, password: String) = runBusy {
        api.register(name, email, password)
        _state.update { it.copy(toast = "Account created. Please sign in.") }
    }

    fun resetPassword(email: String, password: String) = runBusy {
        api.forgotPassword(email, password)
        _state.update { it.copy(toast = "Password reset. Please sign in.") }
    }

    fun logout() {
        prefs.edit().remove(TOKEN_KEY).apply()
        player.stop()
        _state.value = UiState(loading = false, screen = Screen.Auth)
    }

    fun go(screen: Screen) {
        _state.update { it.copy(screen = screen) }
        if (screen == Screen.Home || screen == Screen.Library) refreshPlaylists()
    }

    fun openPlaylist(id: String) {
        _state.update { it.copy(selectedPlaylistId = id, screen = Screen.Playlist) }
    }

    fun refreshPlaylists() = viewModelScope.launch {
        if (_state.value.token == null) return@launch
        _state.update { it.copy(busy = true) }
        try {
            val playlists = api.getPlaylists()
            _state.update { it.copy(playlists = playlists, busy = false) }
        } catch (e: ApiException) {
            if (e.status == 401) logout() else showToast(e.message ?: "Could not load playlists")
            _state.update { it.copy(busy = false) }
        } catch (e: Exception) {
            _state.update { it.copy(busy = false, toast = e.message ?: "Network error") }
        }
    }

    fun createPlaylist(name: String) = runBusy {
        api.createPlaylist(name)
        _state.update { it.copy(toast = "Playlist created") }
        refreshPlaylists()
    }

    fun renamePlaylist(id: String, name: String) = runBusy {
        api.updatePlaylist(id, name)
        refreshPlaylists()
        showToast("Renamed")
    }

    fun deletePlaylist(id: String) = runBusy {
        api.deletePlaylist(id)
        _state.update { it.copy(screen = Screen.Library, selectedPlaylistId = null, toast = "Playlist deleted") }
        refreshPlaylists()
    }

    fun updateSong(playlistId: String, songId: String, name: String, artist: String) = runBusy {
        api.updateSong(playlistId, songId, name, artist)
        refreshPlaylists()
        showToast("Song updated")
    }

    fun deleteSong(playlistId: String, songId: String) = runBusy {
        api.deleteSong(playlistId, songId)
        refreshPlaylists()
        showToast("Song removed")
    }

    fun setQuery(query: String) = _state.update { it.copy(query = query) }
    fun setFilter(filter: SearchFilter) = _state.update { it.copy(searchFilter = filter, searchResults = emptyList()) }

    fun search() = runBusy {
        val s = _state.value
        if (s.query.isBlank()) return@runBusy
        val results = if (s.searchFilter == SearchFilter.Songs) {
            api.searchSongs(s.query)
        } else {
            api.searchMusic(s.query, s.searchFilter.id)
        }
        _state.update { it.copy(searchResults = results) }
    }

    fun play(song: Song, queue: List<Song> = listOf(song), index: Int = 0) {
        if (queue.isEmpty()) return
        val safeIndex = index.coerceIn(queue.indices)
        _state.update { it.copy(currentSong = song, queue = queue, queueIndex = safeIndex) }
        player.play(song, _state.value.token)
    }

    fun playMusicResult(result: MusicResult) = runBusy {
        val songs = when (result.type) {
            "playlist" -> api.playlistTracks(result.playlistId)
            "album" -> api.albumTracks(result.browseId)
            else -> api.artistTracks(result.browseId)
        }
        if (songs.isNotEmpty()) {
            play(songs.first(), songs, 0)
            showToast("Now playing")
        } else {
            showToast("No playable songs found")
        }
    }

    fun addSongToPlaylist(playlistId: String, song: Song) = runBusy {
        api.addSong(playlistId, song)
        refreshPlaylists()
        showToast("Added to playlist")
    }

    fun togglePlay() {
        player.toggle()
        _state.update { it.copy(isPlaying = player.isPlaying()) }
    }

    fun next() {
        val s = _state.value
        if (s.queue.isEmpty()) return
        val nextIndex = (s.queueIndex + 1).coerceAtMost(s.queue.lastIndex)
        play(s.queue[nextIndex], s.queue, nextIndex)
    }

    fun previous() {
        val s = _state.value
        if (s.queue.isEmpty()) return
        val prevIndex = (s.queueIndex - 1).coerceAtLeast(0)
        play(s.queue[prevIndex], s.queue, prevIndex)
    }

    fun showToast(message: String) {
        _state.update { it.copy(toast = message) }
        viewModelScope.launch {
            delay(2500)
            _state.update { it.copy(toast = null) }
        }
    }

    private fun runBusy(block: suspend () -> Unit) = viewModelScope.launch {
        _state.update { it.copy(busy = true) }
        try {
            block()
        } catch (e: ApiException) {
            if (e.status == 401) logout() else showToast(e.message ?: "Request failed")
        } catch (e: Exception) {
            showToast(e.message ?: "Something went wrong")
        } finally {
            _state.update { it.copy(busy = false) }
        }
    }

    override fun onCleared() {
        player.release()
        super.onCleared()
    }
}

class MelodixPlayer(app: Application, private val onStatus: (Boolean, Float) -> Unit) {
    private val okHttp = OkHttpClient.Builder().build()
    private val dataSource = OkHttpDataSource.Factory(okHttp)
    private val player = ExoPlayer.Builder(app)
        .setMediaSourceFactory(DefaultMediaSourceFactory(dataSource))
        .build()

    init {
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) = report()
            override fun onIsPlayingChanged(isPlaying: Boolean) = report()
        })
    }

    fun play(song: Song, token: String?) {
        val id = song.streamId
        if (id.isBlank()) return
        dataSource.setDefaultRequestProperties(
            if (token.isNullOrBlank()) emptyMap() else mapOf("Authorization" to "Bearer $token")
        )
        player.setMediaItem(MediaItem.fromUri("$API_BASE_URL/api/stream/$id"))
        player.prepare()
        player.play()
        report()
    }

    fun toggle() {
        if (player.isPlaying) player.pause() else player.play()
        report()
    }

    fun stop() {
        player.stop()
        report()
    }

    fun isPlaying() = player.isPlaying

    fun tick() = report()

    fun release() = player.release()

    private fun report() {
        val duration = player.duration.takeIf { it > 0 } ?: 0
        val progress = if (duration == 0L) 0f else (player.currentPosition.toFloat() / duration).coerceIn(0f, 1f)
        onStatus(player.isPlaying, progress)
    }
}

class ApiException(message: String, val status: Int) : Exception(message)

class MelodixApi(private val tokenProvider: () -> String?) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    suspend fun login(email: String, password: String): String {
        val json = post(
            "/api/auth/login",
            JSONObject().put("email", email.trim().lowercase()).put("password", password),
            false
        )
        return json.optString("token")
    }

    suspend fun register(name: String, email: String, password: String) {
        post(
            "/api/auth/register",
            JSONObject().put("name", name).put("email", email.trim().lowercase()).put("password", password),
            false
        )
    }

    suspend fun forgotPassword(email: String, password: String) {
        post(
            "/api/auth/forgot-password",
            JSONObject().put("email", email.trim().lowercase()).put("newPassword", password),
            false
        )
    }

    suspend fun getPlaylists(): List<Playlist> = getArray("/api/playlists").mapJsonObjects { it.toPlaylist() }
    suspend fun createPlaylist(name: String) = post("/api/playlists", JSONObject().put("name", name).put("importUrl", ""))
    suspend fun updatePlaylist(id: String, name: String) = put("/api/playlists/$id", JSONObject().put("name", name))
    suspend fun deletePlaylist(id: String) = delete("/api/playlists/$id")
    suspend fun deleteSong(playlistId: String, songId: String) = delete("/api/playlists/$playlistId/songs/$songId")

    suspend fun updateSong(playlistId: String, songId: String, name: String, artist: String) {
        put("/api/playlists/$playlistId/songs/$songId", JSONObject().put("name", name).put("artist", artist))
    }

    suspend fun addSong(playlistId: String, song: Song) {
        post(
            "/api/playlists/$playlistId/songs",
            JSONObject()
                .put("name", song.displayName)
                .put("artist", song.artist)
                .put("album", song.album.ifBlank { "YouTube" })
                .put("duration", song.duration)
                .put("youtubeId", song.streamId)
                .put("youtubeLink", song.youtubeLink)
                .put("thumbnail", song.thumbnail)
        )
    }

    suspend fun searchSongs(query: String): List<MusicResult> =
        getArray("/api/youtube/search?query=${query.enc()}").mapJsonObjects { it.toMusicResult("song") }

    suspend fun searchMusic(query: String, type: String): List<MusicResult> =
        getArray("/api/youtube/search/music?query=${query.enc()}&type=${type.enc()}").mapJsonObjects { it.toMusicResult("song") }

    suspend fun playlistTracks(playlistId: String): List<Song> {
        val json = getObject("/api/youtube/playlist/${playlistId.enc()}")
        return json.optJSONArray("tracks").orEmpty().mapJsonObjects { it.toSong() }
    }

    suspend fun albumTracks(browseId: String): List<Song> {
        val json = getObject("/api/youtube/album/${browseId.enc()}")
        return json.optJSONArray("tracks").orEmpty().mapJsonObjects { it.toSong() }
    }

    suspend fun artistTracks(browseId: String): List<Song> {
        val json = getObject("/api/youtube/artist/${browseId.enc()}")
        return json.optJSONArray("tracks").orEmpty().mapJsonObjects { it.toSong() }
    }

    private suspend fun getObject(path: String) = request("GET", path) as JSONObject
    private suspend fun getArray(path: String) = request("GET", path) as JSONArray
    private suspend fun post(path: String, body: JSONObject, auth: Boolean = true) =
        request("POST", path, body, auth) as? JSONObject ?: JSONObject()

    private suspend fun put(path: String, body: JSONObject) =
        request("PUT", path, body) as? JSONObject ?: JSONObject()
    private suspend fun delete(path: String) { request("DELETE", path) }

    private suspend fun request(method: String, path: String, body: JSONObject? = null, auth: Boolean = true): Any? =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url("$API_BASE_URL$path")
            if (auth) tokenProvider()?.let { builder.addHeader("Authorization", "Bearer $it") }
            body?.let { builder.addHeader("Content-Type", "application/json") }
            val requestBody = body?.toString()?.toRequestBody(jsonType)
            builder.method(method, if (method == "GET") null else requestBody ?: ByteArray(0).toRequestBody())
            val response = client.newCall(builder.build()).execute()
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = raw.takeIf { it.isNotBlank() }?.let { runCatching { JSONObject(it).optString("message") }.getOrNull() }
                throw ApiException(message ?: "Request failed (${response.code})", response.code)
            }
            if (raw.isBlank()) return@withContext null
            val trimmed = raw.trim()
            if (trimmed.startsWith("[")) JSONArray(trimmed) else JSONObject(trimmed)
        }

    private fun JSONObject.toPlaylist() = Playlist(
        id = optString("_id"),
        name = optString("name", "Untitled"),
        songs = optJSONArray("songs").orEmpty().mapJsonObjects { it.toSong() }
    )

    private fun JSONObject.toSong() = Song(
        id = optString("_id"),
        name = optString("name"),
        title = optString("title"),
        artist = optString("artist"),
        album = optString("album"),
        duration = optString("duration"),
        youtubeId = optString("youtubeId"),
        videoId = optString("videoId"),
        youtubeLink = optString("youtubeLink"),
        thumbnail = optString("thumbnail")
    )

    private fun JSONObject.toMusicResult(defaultType: String) = MusicResult(
        type = optString("type", defaultType),
        title = optString("title"),
        name = optString("name"),
        author = optString("author"),
        artist = optString("artist"),
        subscribers = optString("subscribers"),
        thumbnail = optString("thumbnail"),
        playlistId = optString("playlistId"),
        browseId = optString("browseId"),
        videoId = optString("videoId"),
        duration = optString("duration"),
        youtubeLink = optString("youtubeLink")
    )

    private fun String.enc() = URLEncoder.encode(this, Charsets.UTF_8.name())
    private fun JSONArray?.orEmpty() = this ?: JSONArray()
    private inline fun <T> JSONArray.mapJsonObjects(map: (JSONObject) -> T): List<T> =
        (0 until length()).mapNotNull { optJSONObject(it)?.let(map) }
}

@Composable
fun MelodixTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF1DB954),
            background = Color.Black,
            surface = Color(0xFF121212),
            onPrimary = Color.Black,
            onBackground = Color.White,
            onSurface = Color.White
        ),
        content = content
    )
}

@Composable
fun MelodixApp(viewModel: MelodixViewModel) {
    val state by viewModel.state.collectAsState()

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        if (state.loading) {
            Loading()
        } else if (state.screen == Screen.Auth || state.token == null) {
            AuthScreen(state, viewModel)
        } else {
            Scaffold(
                containerColor = Color.Black,
                bottomBar = {
                    Column {
                        MiniPlayer(state, viewModel)
                        NavigationBar(containerColor = Color(0xFF080808)) {
                            NavigationBarItem(
                                selected = state.screen == Screen.Home,
                                onClick = { viewModel.go(Screen.Home) },
                                icon = { Icon(Icons.Default.MusicNote, null) },
                                label = { Text("Home") }
                            )
                            NavigationBarItem(
                                selected = state.screen == Screen.Search,
                                onClick = { viewModel.go(Screen.Search) },
                                icon = { Icon(Icons.Default.Search, null) },
                                label = { Text("Search") }
                            )
                            NavigationBarItem(
                                selected = state.screen == Screen.Library,
                                onClick = { viewModel.go(Screen.Library) },
                                icon = { Icon(Icons.Default.LibraryMusic, null) },
                                label = { Text("Library") }
                            )
                        }
                    }
                }
            ) { padding ->
                Box(Modifier.padding(padding)) {
                    when (state.screen) {
                        Screen.Home -> HomeScreen(state, viewModel)
                        Screen.Search -> SearchScreen(state, viewModel)
                        Screen.Library -> LibraryScreen(state, viewModel)
                        Screen.Playlist -> PlaylistScreen(state, viewModel)
                        Screen.Auth -> AuthScreen(state, viewModel)
                    }
                }
            }
        }

        state.toast?.let {
            Surface(
                color = Color(0xFF1DB954),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.align(Alignment.BottomCenter).padding(24.dp)
            ) {
                Text(it, color = Color.Black, fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp))
            }
        }
    }
}

@Composable
fun AuthScreen(state: UiState, vm: MelodixViewModel) {
    var mode by remember { mutableStateOf(AuthMode.Login) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A)),
        contentPadding = PaddingValues(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Spacer(Modifier.height(36.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(
                    Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(Color(0x221DB954)),
                    contentAlignment = Alignment.Center
                ) { Icon(Icons.Default.MusicNote, null, tint = Color(0xFF1DB954), modifier = Modifier.size(34.dp)) }
                Text("Melodix", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
            }
            Text("\"Where words fail,\nmusic speaks.\"", color = Color.White, fontSize = 20.sp, modifier = Modifier.padding(vertical = 28.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF171717)), shape = RoundedCornerShape(24.dp)) {
                Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        when (mode) {
                            AuthMode.Login -> "Welcome Back"
                            AuthMode.Register -> "Create Account"
                            AuthMode.Forgot -> "Reset Password"
                        },
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    if (mode == AuthMode.Register) {
                        Field(name, { name = it }, "Full Name", Icons.Default.Person)
                    }
                    Field(email, { email = it }, "Email Address", Icons.Default.Person)
                    Field(
                        password,
                        { password = it },
                        if (mode == AuthMode.Forgot) "New Password" else "Password",
                        Icons.Default.Lock,
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        trailing = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                            }
                        }
                    )
                    Button(
                        onClick = {
                            when (mode) {
                                AuthMode.Login -> vm.login(email, password)
                                AuthMode.Register -> vm.register(name, email, password)
                                AuthMode.Forgot -> vm.resetPassword(email, password)
                            }
                        },
                        enabled = !state.busy,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1DB954)),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        if (state.busy) CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(20.dp)) else Text(
                            when (mode) {
                                AuthMode.Login -> "Sign In"
                                AuthMode.Register -> "Create Account"
                                AuthMode.Forgot -> "Reset Password"
                            },
                            color = Color.Black,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        TextButton(onClick = {
                            mode = when (mode) {
                                AuthMode.Login -> AuthMode.Register
                                AuthMode.Register -> AuthMode.Login
                                AuthMode.Forgot -> AuthMode.Login
                            }
                        }) {
                            Text(if (mode == AuthMode.Login) "Create an account" else "Back to login")
                        }
                        if (mode == AuthMode.Login) TextButton(onClick = { mode = AuthMode.Forgot }) { Text("Forgot?") }
                    }
                }
            }
        }
    }
}

@Composable
fun HomeScreen(state: UiState, vm: MelodixViewModel) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text(greeting(), color = Color(0xFF9A9A9A), fontWeight = FontWeight.SemiBold)
                    Text("Melodix", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
                }
                IconButton(onClick = { vm.logout() }) { Icon(Icons.AutoMirrored.Filled.Logout, null, tint = Color(0xFF9A9A9A)) }
            }
        }
        if (state.busy && state.playlists.isEmpty()) item { Loading() }
        if (state.playlists.isNotEmpty()) {
            item { Text("Recently Played", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold) }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(state.playlists.take(6)) { PlaylistTile(it, vm) }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Your Playlists", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                    TextButton(onClick = { vm.go(Screen.Library) }) { Text("See all") }
                }
            }
            items(state.playlists.take(8)) { PlaylistRow(it, vm) }
        } else if (!state.busy) {
            item { EmptyState("No playlists yet", "Create your first playlist from Library.") }
        }
    }
}

@Composable
fun SearchScreen(state: UiState, vm: MelodixViewModel) {
    var pickerSong by remember { mutableStateOf<Song?>(null) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Search", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Field(state.query, vm::setQuery, "What do you want to play?", Icons.Default.Search, modifier = Modifier.weight(1f))
                Button(onClick = { vm.search() }, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1DB954))) {
                    Text("Go", color = Color.Black, fontWeight = FontWeight.Black)
                }
            }
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(SearchFilter.entries) { filter ->
                    Button(
                        onClick = { vm.setFilter(filter) },
                        colors = ButtonDefaults.buttonColors(containerColor = if (state.searchFilter == filter) Color.White else Color(0xFF222222))
                    ) {
                        Icon(filter.icon, null, tint = if (state.searchFilter == filter) Color.Black else Color.White, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(filter.label, color = if (state.searchFilter == filter) Color.Black else Color.White)
                    }
                }
            }
        }
        if (state.busy) item { Loading() }
        items(state.searchResults) { result ->
            if (state.searchFilter == SearchFilter.Songs) {
                SongRow(result.asSong(), onPlay = { vm.play(result.asSong(), state.searchResults.map { it.asSong() }, state.searchResults.indexOf(result)) }, onAdd = { pickerSong = result.asSong() })
            } else {
                MusicResultCard(result) { vm.playMusicResult(result) }
            }
        }
    }
    pickerSong?.let { song ->
        PlaylistPicker(state.playlists, onDismiss = { pickerSong = null }) {
            vm.addSongToPlaylist(it.id, song)
            pickerSong = null
        }
    }
}

@Composable
fun LibraryScreen(state: UiState, vm: MelodixViewModel) {
    var search by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    val filtered = state.playlists.filter { it.name.contains(search, ignoreCase = true) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Your Library", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
                IconButton(onClick = { showCreate = true }) { Icon(Icons.Default.Add, null) }
            }
        }
        item { Field(search, { search = it }, "Search playlists...", Icons.Default.Search) }
        if (filtered.isEmpty()) item { EmptyState("No playlists found", "Use the add button to create one.") }
        items(filtered) { PlaylistRow(it, vm) }
    }
    if (showCreate) NameDialog("New Playlist", "Playlist name", onDismiss = { showCreate = false }) {
        vm.createPlaylist(it)
        showCreate = false
    }
}

@Composable
fun PlaylistScreen(state: UiState, vm: MelodixViewModel) {
    val playlist = state.playlists.firstOrNull { it.id == state.selectedPlaylistId }
    var search by remember { mutableStateOf("") }
    var rename by remember { mutableStateOf(false) }
    var editSong by remember { mutableStateOf<Song?>(null) }
    var deletePlaylist by remember { mutableStateOf(false) }
    if (playlist == null) {
        Loading()
        return
    }
    val songs = playlist.songs.filter { it.displayName.contains(search, true) || it.artist.contains(search, true) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .background(Brush.verticalGradient(listOf(playlistColor(playlist.id), Color.Black))),
                contentAlignment = Alignment.Center
            ) {
                IconButton(onClick = { vm.go(Screen.Library) }, modifier = Modifier.align(Alignment.TopStart).padding(12.dp)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                }
                Cover(playlist.songs.firstOrNull()?.thumbnail, Modifier.size(180.dp), 12.dp)
            }
        }
        item {
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(playlist.name, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                    IconButton(onClick = { rename = true }) { Icon(Icons.Default.Edit, null, tint = Color(0xFF9A9A9A)) }
                }
                Text("${playlist.songs.size} songs", color = Color(0xFF9A9A9A))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = { if (songs.isNotEmpty()) vm.play(songs.first(), songs, 0) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1DB954)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.PlayArrow, null, tint = Color.Black)
                        Text("Play All", color = Color.Black, fontWeight = FontWeight.Black)
                    }
                    IconButton(onClick = { deletePlaylist = true }) { Icon(Icons.Default.DeleteOutline, null, tint = Color(0xFFF87171)) }
                }
                if (playlist.songs.isNotEmpty()) Field(search, { search = it }, "Search songs...", Icons.Default.Search)
            }
        }
        if (songs.isEmpty()) item { EmptyState("No songs", "Search for music and add it to this playlist.") }
        items(songs) { song ->
            SongRow(
                song,
                isCurrent = state.currentSong?.streamId == song.streamId,
                onPlay = { vm.play(song, songs, songs.indexOf(song)) },
                onEdit = { editSong = song },
                onDelete = { vm.deleteSong(playlist.id, song.id) }
            )
        }
    }
    if (rename) NameDialog("Rename Playlist", playlist.name, onDismiss = { rename = false }) {
        vm.renamePlaylist(playlist.id, it)
        rename = false
    }
    editSong?.let { song ->
        EditSongDialog(song, onDismiss = { editSong = null }) { name, artist ->
            vm.updateSong(playlist.id, song.id, name, artist)
            editSong = null
        }
    }
    if (deletePlaylist) {
        ConfirmDialog("Delete Playlist", "Delete \"${playlist.name}\"? This cannot be undone.", onDismiss = { deletePlaylist = false }) {
            vm.deletePlaylist(playlist.id)
            deletePlaylist = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Field(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailing: @Composable (() -> Unit)? = null
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        trailingIcon = trailing,
        visualTransformation = visualTransformation,
        singleLine = true,
        modifier = modifier.fillMaxWidth()
    )
}

@Composable
fun PlaylistTile(playlist: Playlist, vm: MelodixViewModel) {
    Card(
        modifier = Modifier.width(150.dp).clickable { vm.openPlaylist(playlist.id) },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF181818)),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(Modifier.padding(10.dp)) {
            Cover(playlist.songs.firstOrNull()?.thumbnail, Modifier.size(130.dp), 8.dp)
            Text(playlist.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
            Text("${playlist.songs.size} songs", color = Color(0xFF9A9A9A), fontSize = 12.sp)
        }
    }
}

@Composable
fun PlaylistRow(playlist: Playlist, vm: MelodixViewModel) {
    Row(
        Modifier.fillMaxWidth().clickable { vm.openPlaylist(playlist.id) }.padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Cover(playlist.songs.firstOrNull()?.thumbnail, Modifier.size(54.dp), 6.dp)
        Column(Modifier.weight(1f)) {
            Text(playlist.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("Playlist - ${playlist.songs.size} songs", color = Color(0xFF9A9A9A), fontSize = 12.sp)
        }
    }
}

@Composable
fun SongRow(
    song: Song,
    isCurrent: Boolean = false,
    onPlay: () -> Unit,
    onAdd: (() -> Unit)? = null,
    onEdit: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null
) {
    Row(
        Modifier.fillMaxWidth().clickable { onPlay() }.padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Cover(song.thumbnail, Modifier.size(46.dp), 4.dp)
        Column(Modifier.weight(1f)) {
            Text(song.displayName, color = if (isCurrent) Color(0xFF1DB954) else Color.White, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(song.artist, color = Color(0xFF9A9A9A), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (song.duration.isNotBlank()) Text(song.duration, color = Color(0xFF9A9A9A), fontSize = 11.sp)
        onAdd?.let { IconButton(onClick = it) { Icon(Icons.Default.Add, null, tint = Color(0xFF9A9A9A)) } }
        onEdit?.let { IconButton(onClick = it) { Icon(Icons.Default.Edit, null, tint = Color(0xFF9A9A9A)) } }
        onDelete?.let { IconButton(onClick = it) { Icon(Icons.Default.DeleteOutline, null, tint = Color(0xFF9A9A9A)) } }
    }
}

@Composable
fun MusicResultCard(result: MusicResult, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onClick() }.padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Cover(result.thumbnail, Modifier.size(64.dp), if (result.type == "artist") 32.dp else 8.dp)
        Column {
            Text(result.label, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(result.sublabel, color = Color(0xFF9A9A9A), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
fun Cover(url: String?, modifier: Modifier, radius: androidx.compose.ui.unit.Dp) {
    if (url.isNullOrBlank()) {
        Box(modifier.clip(RoundedCornerShape(radius)).background(playlistColor(url.orEmpty())), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.LibraryMusic, null, tint = Color.White.copy(alpha = 0.65f))
        }
    } else {
        Image(
            painter = rememberAsyncImagePainter(url),
            contentDescription = null,
            modifier = modifier.clip(RoundedCornerShape(radius)),
            contentScale = ContentScale.Crop
        )
    }
}

@Composable
fun MiniPlayer(state: UiState, vm: MelodixViewModel) {
    val song = state.currentSong ?: return
    Row(
        Modifier.fillMaxWidth().background(Color(0xFF181818)).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Cover(song.thumbnail, Modifier.size(44.dp), 4.dp)
        Column(Modifier.weight(1f)) {
            Text(song.displayName, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold)
            Text(song.artist, color = Color(0xFF9A9A9A), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        IconButton(onClick = { vm.previous() }) { Icon(Icons.Default.SkipPrevious, null) }
        IconButton(onClick = { vm.togglePlay() }) { Icon(if (state.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, null, tint = Color(0xFF1DB954)) }
        IconButton(onClick = { vm.next() }) { Icon(Icons.Default.SkipNext, null) }
    }
}

@Composable
fun PlaylistPicker(playlists: List<Playlist>, onDismiss: () -> Unit, onPick: (Playlist) -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add to Playlist") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                playlists.forEach { p ->
                    Row(Modifier.fillMaxWidth().clickable { onPick(p) }.padding(vertical = 8.dp)) {
                        Text(p.name, modifier = Modifier.weight(1f))
                        Text("${p.songs.size} songs", color = Color(0xFF9A9A9A))
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun NameDialog(title: String, placeholder: String, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var value by remember { mutableStateOf(if (placeholder == "Playlist name") "" else placeholder) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Field(value, { value = it }, placeholder, Icons.Default.Edit) },
        confirmButton = { TextButton(onClick = { if (value.isNotBlank()) onSave(value.trim()) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun EditSongDialog(song: Song, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var name by remember { mutableStateOf(song.displayName) }
    var artist by remember { mutableStateOf(song.artist) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Song") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Field(name, { name = it }, "Song name", Icons.Default.MusicNote)
                Field(artist, { artist = it }, "Artist", Icons.Default.Person)
            }
        },
        confirmButton = { TextButton(onClick = { onSave(name, artist) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun ConfirmDialog(title: String, text: String, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(text) },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Delete", color = Color(0xFFF87171)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun EmptyState(title: String, subtitle: String) {
    Column(Modifier.fillMaxWidth().padding(48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Default.LibraryMusic, null, tint = Color(0xFF383838), modifier = Modifier.size(56.dp))
        Text(title, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
        Text(subtitle, color = Color(0xFF9A9A9A))
    }
}

@Composable
fun Loading() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Color(0xFF1DB954))
    }
}

fun greeting(): String {
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    return when (hour) {
        in 5..11 -> "Good morning"
        in 12..16 -> "Good afternoon"
        in 17..20 -> "Good evening"
        else -> "Good night"
    }
}

fun playlistColor(seed: String): Color {
    val colors = listOf(Color(0xFF1DB954), Color(0xFF4F46E5), Color(0xFFEF4444), Color(0xFF0891B2), Color(0xFFCA8A04))
    return colors[kotlin.math.abs(seed.hashCode()).mod(colors.size)]
}
