import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { PlayerProvider } from '../context/PlayerContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <StatusBar style="light" backgroundColor="#000" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="playlist/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </PlayerProvider>
    </AuthProvider>
  );
}
