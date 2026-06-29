package com.sanjeeb.melodix.data.repository

import com.sanjeeb.melodix.data.local.PrefsManager
import com.sanjeeb.melodix.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class AuthRepository(
    private val api: ApiService,
    private val prefs: PrefsManager
) {
    suspend fun login(email: String, password: String) = withContext(Dispatchers.IO) {
        val response = api.login(email, password)
        saveAuthData(response)
    }

    suspend fun register(username: String, email: String, password: String) = withContext(Dispatchers.IO) {
        val response = api.register(username, email, password)
        saveAuthData(response)
    }

    fun logout() {
        prefs.clearToken()
    }

    private fun saveAuthData(response: JSONObject) {
        if (response.has("token")) {
            prefs.saveToken(response.getString("token"))
        }
    }
}
