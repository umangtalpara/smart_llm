'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/auth';
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, error, clearError, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name || !email || !password || !confirmPassword) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    try {
      await register(email, name, password);
      router.push('/dashboard');
    } catch {
      // Handled by store state
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-primary animate-float mb-2 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight font-outfit">
          Join <span className="text-primary glow-text">ProxyLLM</span>
        </h1>
        <p className="text-sm text-slate-400">
          Create an account to start rotating your API keys
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Errors display */}
        {(validationError || error) && (
          <div className="p-3 text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg text-center backdrop-blur-sm animate-pulse">
            {validationError || error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-semibold text-slate-300">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-semibold text-slate-300">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-xs font-semibold text-slate-300">
            Password (min 8 characters)
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
          disabled={isLoading}
          className="w-full h-12 btn-neon font-bold text-sm flex items-center justify-center space-x-2 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline hover:text-cyan-400 font-semibold">
          Log In
        </Link>
      </div>
    </div>
  );
}
