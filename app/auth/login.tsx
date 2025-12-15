import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button } from '@/components';
import { useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter email and password');
      return;
    }
    
    try {
      await signIn(email.trim(), password);
      router.back();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue your adventures</Text>
        
        <Input
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <Input
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button
          title={isLoading ? 'Signing in...' : 'Sign In'}
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          size="lg"
          style={styles.loginButton}
        />
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Button
            title="Create Account"
            onPress={() => router.replace('/auth/register')}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  loginButton: { marginTop: Spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary },
});
