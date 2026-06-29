package com.sanjeeb.melodix.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sanjeeb.melodix.di.AppModule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(AuthState())
    val uiState: StateFlow<AuthState> = _uiState.asStateFlow()

    fun onEmailChange(email: String) {
        _uiState.value = _uiState.value.copy(email = email)
    }

    fun onPasswordChange(password: String) {
        _uiState.value = _uiState.value.copy(password = password)
    }

    fun onUsernameChange(username: String) {
        _uiState.value = _uiState.value.copy(username = username)
    }

    fun toggleMode() {
        val isLogin = _uiState.value.isLoginMode
        _uiState.value = _uiState.value.copy(isLoginMode = !isLogin, error = null)
    }

    fun submit(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.email.isBlank() || state.password.isBlank() || (!state.isLoginMode && state.username.isBlank())) {
            _uiState.value = state.copy(error = "Please fill in all fields")
            return
        }
        
        _uiState.value = state.copy(isLoading = true, error = null)
        
        viewModelScope.launch {
            try {
                if (state.isLoginMode) {
                    AppModule.authRepository.login(state.email, state.password)
                } else {
                    AppModule.authRepository.register(state.username, state.email, state.password)
                }
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                onSuccess()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Authentication failed")
            }
        }
    }
}

data class AuthState(
    val isLoginMode: Boolean = true,
    val email: String = "",
    val password: String = "",
    val username: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)
