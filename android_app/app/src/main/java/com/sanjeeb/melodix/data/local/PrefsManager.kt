package com.sanjeeb.melodix.data.local

import android.content.Context

class PrefsManager(context: Context) {
    private val prefs = context.getSharedPreferences("melodix_prefs", Context.MODE_PRIVATE)

    fun saveToken(token: String) = prefs.edit().putString(KEY_TOKEN, token).apply()
    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)
    fun clearToken() = prefs.edit().remove(KEY_TOKEN).apply()

    fun saveDisplayName(name: String) = prefs.edit().putString(KEY_DISPLAY_NAME, name).apply()
    fun getDisplayName(): String? = prefs.getString(KEY_DISPLAY_NAME, null)

    fun isLoggedIn(): Boolean = !getToken().isNullOrBlank()

    private companion object {
        const val KEY_TOKEN = "token"
        const val KEY_DISPLAY_NAME = "displayName"
    }
}
