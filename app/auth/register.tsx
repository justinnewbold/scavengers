import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button } from '@/components';
import { useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    
    try {
      await signUp(email.trim(), password, displayName.trim());
      Alert.alert(
        'Account Created!',
        'Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the adventure!</Text>
        
        <Input
          label="Display Name"
          placeholder="How should we call you?"
          value={displayName}
          onChangeText={setDisplayName}
          autoCorrect={false}
        />
        
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
          helper="At least 6 characters"
        />
        
        <Input
          label="Confirm Password"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <Button
          title={isLoading ? 'Creating account...' : 'Create Account'}
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
          size="lg"
          style={styles.registerButton}
        />
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Button
            title="Sign In"
            onPress={() => router.replace('/auth/login')}
            variant="ghost"
            size="sm"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  registerButton: { marginTop: Spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary },
});
