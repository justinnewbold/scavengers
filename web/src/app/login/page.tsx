'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Map } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'signup') {
      // Strict validation for signup to match server requirements
      if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = 'Password must contain an uppercase letter';
      } else if (!/[a-z]/.test(password)) {
        newErrors.password = 'Password must contain a lowercase letter';
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = 'Password must contain a number';
      }
    } else if (password.length < 1) {
      // For login, just require non-empty (server will validate)
      newErrors.password = 'Password is required';
    }

    if (mode === 'signup' && !displayName) {
      newErrors.displayName = 'Display name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.success) {
          showToast('Welcome back!', 'success');
          router.push('/');
        } else {
          showToast(result.error || 'Login failed', 'error');
        }
      } else {
        const result = await register(email, password, displayName);
        if (result.success) {
          showToast('Account created successfully!', 'success');
          router.push('/');
        } else {
          showToast(result.error || 'Registration failed', 'error');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#FF6B35]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#1A535C]/20 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFE66D] flex items-center justify-center shadow-lg shadow-[#FF6B35]/20">
            <Map className="w-6 h-6 text-white" />
          </div>
          <span className="font-display text-3xl text-white tracking-wider">SCAVENGERS</span>
        </Link>

        {/* Auth Card */}
        <div className="bg-[#161B22] rounded-2xl border border-[#30363D] p-8">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-[#21262D] rounded-xl mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-[#FF6B35] text-white'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-[#FF6B35] text-white'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-[#8B949E] mb-6">
            {mode === 'login'
              ? 'Sign in to continue your adventure'
              : 'Start creating and playing scavenger hunts'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#484F58]" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#21262D] border ${
                      errors.displayName ? 'border-red-500' : 'border-[#30363D]'
                    } text-white placeholder-[#484F58] focus:outline-none focus:border-[#FF6B35]`}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-red-400 text-sm mt-1">{errors.displayName}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#8B949E] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#484F58]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#21262D] border ${
                    errors.email ? 'border-red-500' : 'border-[#30363D]'
                  } text-white placeholder-[#484F58] focus:outline-none focus:border-[#FF6B35]`}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#8B949E] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#484F58]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? '8+ chars, upper, lower, number' : 'Enter password'}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-[#21262D] border ${
                    errors.password ? 'border-red-500' : 'border-[#30363D]'
                  } text-white placeholder-[#484F58] focus:outline-none focus:border-[#FF6B35]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484F58] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#30363D]" />
            <span className="text-[#484F58] text-sm">or</span>
            <div className="flex-1 h-px bg-[#30363D]" />
          </div>

          {/* Guest Mode */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/')}
          >
            Continue as Guest
          </Button>

          <p className="text-center text-[#8B949E] text-sm mt-6">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-[#FF6B35] hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-[#FF6B35] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </main>
  );
}
