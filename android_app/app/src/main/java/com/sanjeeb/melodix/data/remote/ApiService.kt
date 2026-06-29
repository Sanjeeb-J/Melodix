package com.sanjeeb.melodix.data.remote

import com.sanjeeb.melodix.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

class ApiService(private val client: OkHttpClient) {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val baseUrl = BuildConfig.BACKEND_URL.trimEnd('/')

    suspend fun login(email: String, password: String): JSONObject =
        post("/api/auth/login", JSONObject().put("email", email.trim().lowercase()).put("password", password))

    suspend fun register(username: String, email: String, password: String): JSONObject =
        post("/api/auth/register", JSONObject().put("username", username.trim()).put("email", email.trim().lowercase()).put("password", password))

    suspend fun getPlaylists(): String = get("/api/playlists")

    suspend fun getLikedSongs(): String = get("/api/liked")

    suspend fun likeSong(videoId: String, body: JSONObject): JSONObject =
        post("/api/liked/${videoId.enc()}", body)

    suspend fun unlikeSong(videoId: String) {
        delete("/api/liked/${videoId.enc()}")
    }

    suspend fun getHistory(limit: Int = 50): String = get("/api/history?limit=$limit")

    suspend fun logPlay(body: JSONObject): JSONObject = post("/api/history", body)

    suspend fun getRecommendations(): String = get("/api/recommendations")

    suspend fun search(query: String, type: String = "song"): String =
        get("/api/youtube/search?q=${query.enc()}&type=${type.enc()}")

    suspend fun streamUrl(videoId: String, token: String): String =
        "$baseUrl/api/stream/${videoId.enc()}?token=${token.enc()}"

    private fun get(path: String): String {
        val request = Request.Builder().url("$baseUrl$path").get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("Request failed (${response.code})")
            return response.body?.string().orEmpty()
        }
    }

    private fun post(path: String, body: JSONObject): JSONObject {
        val request = Request.Builder()
            .url("$baseUrl$path")
            .post(body.toString().toRequestBody(jsonType))
            .addHeader("Content-Type", "application/json")
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) error(raw.ifBlank { "Request failed (${response.code})" })
            return JSONObject(raw)
        }
    }

    private fun delete(path: String) {
        val request = Request.Builder().url("$baseUrl$path").delete().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("Request failed (${response.code})")
        }
    }

    private fun String.enc(): String = URLEncoder.encode(this, Charsets.UTF_8.name())

    companion object {
        fun defaultClient(authInterceptor: AuthInterceptor? = null): OkHttpClient =
            OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(45, TimeUnit.SECONDS)
                .apply { if (authInterceptor != null) addInterceptor(authInterceptor) }
                .build()
    }
}
