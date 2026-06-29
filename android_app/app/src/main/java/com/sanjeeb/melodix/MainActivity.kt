package com.sanjeeb.melodix

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.sanjeeb.melodix.di.AppModule
import com.sanjeeb.melodix.ui.navigation.NavGraph
import com.sanjeeb.melodix.ui.theme.MelodixTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize manual DI graph
        AppModule.init(applicationContext)

        enableEdgeToEdge()
        setContent {
            MelodixTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NavGraph()
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Clean up player when activity is destroyed
        if (::AppModule.isInitialized) {
            AppModule.melodixPlayer.release()
        }
    }
}
