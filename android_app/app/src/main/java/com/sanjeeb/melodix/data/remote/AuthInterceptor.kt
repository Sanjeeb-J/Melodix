package com.sanjeeb.melodix.data.remote

import com.sanjeeb.melodix.data.local.PrefsManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val prefsManager: PrefsManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = prefsManager.getToken()
        val request = if (token.isNullOrBlank()) {
            chain.request()
        } else {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        }
        return chain.proceed(request)
    }
}
