import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api/client';
import { useAuth } from '../src/auth/AuthProvider';
import { useTheme } from '../src/theme/ThemeProvider';
import { Button, Card, Input } from '../src/ui';

export default function Login() {
  const t = useTheme();
  const { user, ready, signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [canRegister, setCanRegister] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ registration: boolean }>('/auth/status', { auth: false }).then(r => { setCanRegister(r.registration); }).catch(() => setError('Cannot reach the server.')); }, []);
  if (ready && user) return <Redirect href="/chat/new" />;

  const submit = async () => {
    setBusy(true); setError('');
    try { mode === 'login' ? await signIn(email.trim(), password) : await register(email.trim(), password, name.trim() || undefined); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <LinearGradient colors={[t.colors.sidebar, '#3B2F9E', '#7C3AED']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Card style={{ width: '100%', maxWidth: 400, padding: 24, gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <LinearGradient colors={[...t.gradient]} style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="sparkles" size={24} color="#fff" /></LinearGradient>
            <Text accessibilityRole="header" style={{ color: t.colors.text, fontSize: t.font.xl, fontWeight: '800' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
            <Text style={{ color: t.colors.muted }}>{mode === 'register' ? 'The first account becomes the admin.' : 'Sign in to Axiom AI'}</Text>
          </View>
          {mode === 'register' ? <Input label="Name" value={name} onChangeText={setName} autoComplete="name" /> : null}
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onSubmitEditing={submit} hint={mode === 'register' ? 'At least 8 characters' : undefined} />
          {error ? <Text accessibilityRole="alert" style={{ color: t.colors.danger }}>{error}</Text> : null}
          <Button title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} full disabled={!email || password.length < 8} />
          {canRegister ? <Text onPress={() => setMode(mode === 'login' ? 'register' : 'login')} accessibilityRole="link" style={{ color: t.colors.primary, textAlign: 'center', fontWeight: '600' }}>{mode === 'login' ? 'Create an account' : 'I already have an account'}</Text> : null}
        </Card>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
