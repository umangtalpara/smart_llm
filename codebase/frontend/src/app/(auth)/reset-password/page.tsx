'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../services/api';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  React.useEffect(() => {
    if (!isSuccess) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccess, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Reset token is missing or invalid.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      const errMsg = errorResponse.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center space-y-4 text-center py-4">
        <div className="p-3 text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg text-center backdrop-blur-sm">
          Invalid reset request: Missing token query parameter.
        </div>
        <Link
          href="/login"
          className="btn-neon-outline font-semibold text-xs py-2.5 px-6 mt-4 w-full flex items-center justify-center space-x-2"
        >
          <span>Go to Log In</span>
        </Link>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center space-y-6 text-center py-4"
        >
          {/* Glow Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-white">
              Password Reset!
            </h1>
            <p className="text-sm text-slate-400 max-w-xs">
              Your password has been successfully updated. Redirecting to the login page shortly.
            </p>
          </div>

          {/* Loader Container */}
          <div className="w-full space-y-4 pt-4">
            {/* Countdown Visual Loader */}
            <div className="relative w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="absolute left-0 top-0 h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              />
            </div>
            
            <div className="text-xs text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Redirecting to login in {countdown} seconds...</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 w-full">
            <Link
              href="/login"
              className="w-full h-12 btn-neon-outline font-bold text-sm flex items-center justify-center space-x-2"
            >
              <span>Go to Login Immediately</span>
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-primary animate-float mb-2 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-outfit">
              New <span className="text-primary glow-text">Password</span>
            </h1>
            <p className="text-sm text-slate-400">
              Choose a secure password for your ProxyLLM account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                New Password (min 8 characters)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-12 pl-4 pr-12 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors h-10 w-10 flex items-center justify-center rounded-md"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full h-12 btn-neon font-bold text-sm flex items-center justify-center space-x-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-xs text-slate-400 font-semibold">Loading reset wizard...</span>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
