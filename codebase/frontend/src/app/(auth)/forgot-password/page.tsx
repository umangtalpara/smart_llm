'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call for password reset
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-primary animate-float mb-2 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight font-outfit">
          Reset <span className="text-primary glow-text">Password</span>
        </h1>
        <p className="text-sm text-slate-400">
          We will send you instructions to reset your password
        </p>
      </div>

      {isSubmitted ? (
        <div className="flex flex-col items-center space-y-4 text-center py-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Reset Link Sent</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            We have sent a password reset link to <span className="text-white font-semibold">{email}</span>. Please check your inbox.
          </p>
          <Link
            href="/login"
            className="btn-neon-outline font-semibold text-xs py-2.5 px-6 mt-4 w-full flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Log In</span>
          </Link>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg text-center backdrop-blur-sm">
              {error}
            </div>
          )}

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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 btn-neon font-bold text-sm flex items-center justify-center space-x-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <span>Send Instructions</span>
            )}
          </button>

          <Link
            href="/login"
            className="w-full h-12 rounded-lg border border-white/5 hover:bg-white/[0.02] text-slate-400 hover:text-white transition-all text-xs font-semibold flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Log In</span>
          </Link>
        </form>
      )}
    </div>
  );
}
