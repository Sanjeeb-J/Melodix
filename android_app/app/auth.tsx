import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, forgotPassword } from '../services/authService';

export default function AuthScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [view, setView] = useState('login'); // login | register | forgot
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
  const [forgotData, setForgotData] = useState({ email: '', password: '' });

  const isLogin = view === 'login';
  const isRegister = view === 'register';
  const isForgot = view === 'forgot';

  const handleSubmit = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      if (isLogin) {
        const res = await loginUser(loginData);
        await login(res.token);
        router.replace('/(tabs)');
      } else if (isRegister) {
        await registerUser(registerData);
        Alert.alert('Success', 'Account created! You can now log in.');
        setView('login');
      } else {
        await forgotPassword(forgotData.email, forgotData.password);
        Alert.alert('Success', 'Password reset! You can now log in.');
        setView('login');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="music-note" size={32} color="#1db954" />
          </View>
          <Text style={styles.logoText}>Melodix</Text>
        </View>

        <Text style={styles.tagline}>"Where words fail,{'\n'}music speaks."</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isLogin ? 'Welcome Back' : isRegister ? 'Create Account' : 'Reset Password'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {isLogin ? 'Enter your credentials to access Melodix'
              : isRegister ? 'Join us and start your musical journey'
              : 'Enter your email and a new password'}
          </Text>

          {/* Name field (register only) */}
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="person" size={18} color="#737373" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#737373"
                  value={registerData.name}
                  onChangeText={(v) => setRegisterData({ ...registerData, name: v })}
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="email" size={18} color="#737373" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#737373"
                autoCapitalize="none"
                keyboardType="email-address"
                value={isForgot ? forgotData.email : isLogin ? loginData.email : registerData.email}
                onChangeText={(v) => {
                  if (isForgot) setForgotData({ ...forgotData, email: v });
                  else if (isLogin) setLoginData({ ...loginData, email: v });
                  else setRegisterData({ ...registerData, email: v });
                }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{isForgot ? 'New Password' : 'Password'}</Text>
              {isLogin && (
                <TouchableOpacity onPress={() => setView('forgot')}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputRow}>
              <MaterialIcons name="lock" size={18} color="#737373" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#737373"
                secureTextEntry={!showPassword}
                value={isForgot ? forgotData.password : isLogin ? loginData.password : registerData.password}
                onChangeText={(v) => {
                  if (isForgot) setForgotData({ ...forgotData, password: v });
                  else if (isLogin) setLoginData({ ...loginData, password: v });
                  else setRegisterData({ ...registerData, password: v });
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#737373" />
              </TouchableOpacity>
            </View>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={status === 'loading'}>
            {status === 'loading'
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.submitText}>
                  {isLogin ? 'Sign In' : isRegister ? 'Create Account' : 'Reset Password'}
                </Text>
            }
          </TouchableOpacity>

          {/* Footer link */}
          <View style={styles.footer}>
            {isForgot ? (
              <TouchableOpacity onPress={() => setView('login')}>
                <Text style={styles.switchText}>← Back to Login</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchLink} onPress={() => { setView(isLogin ? 'register' : 'login'); setErrorMsg(''); }}>
                  {isLogin ? 'Sign up' : 'Log in'}
                </Text>
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(29,185,84,0.12)',
    borderWidth: 1, borderColor: 'rgba(29,185,84,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 20, fontStyle: 'italic', color: '#fff', textAlign: 'center', marginBottom: 32, lineHeight: 28 },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#737373', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#737373', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgotLink: { fontSize: 11, color: '#1db954' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  submitBtn: {
    backgroundColor: '#1db954', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitText: { color: '#000', fontWeight: '800', fontSize: 15 },
  footer: { marginTop: 24, alignItems: 'center' },
  switchText: { color: '#737373', fontSize: 13 },
  switchLink: { color: '#1db954', fontWeight: '700' },
});
