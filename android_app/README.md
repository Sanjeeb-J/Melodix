# Melodix Android

Melodix is now a native Android app written in Kotlin with Jetpack Compose.

## Stack

- Kotlin
- Jetpack Compose and Material 3
- Media3 ExoPlayer for audio playback
- OkHttp for the Melodix backend API
- Coil for remote artwork

## Build

Open this folder in Android Studio, let Gradle sync, then run the `app` configuration.

From a terminal with Java, Android SDK, and Gradle available:

```powershell
gradle assembleDebug
```

The app package is `com.sanjeeb.melodix` and points at:

```text
https://melodix-backend.onrender.com
```
