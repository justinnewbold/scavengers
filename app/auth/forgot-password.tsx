import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 429) {
        // Show success state regardless (to prevent email enumeration)
        setIsSubmitted(true);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        Alert.alert('Error', 'Request timed out. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="mail-outline" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            If an account exists for {email}, we've sent a password reset link. Please check your inbox and spam folder.
          </Text>
          <Button
            title="Back to Login"
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => {
              setIsSubmitted(false);
              setEmail('');
            }}
          >
            <Text style={styles.resendText}>Try a different email</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email and we'll send you a reset link.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <Button
              title={isLoading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleSubmit}
              disabled={isLoading}
              style={styles.submitButton}
            />
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={styles.loginLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  backArrow: {
    position: 'absolute',
    top: Spacing.xl,
    left: 0,
    padding: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: Spacing.md,
  },
  input: {
    flex: 1,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  loginLinkText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  backButton: {
    minWidth: 200,
    marginBottom: Spacing.md,
  },
  resendButton: {
    padding: Spacing.md,
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
});
