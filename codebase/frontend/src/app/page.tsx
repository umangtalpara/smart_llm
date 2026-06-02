import React from 'react';
import Link from 'next/link';
import { Shield, Zap, RefreshCw, BarChart2, Layers } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden bg-grid-pattern">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-primary shadow-[0_0_15px_rgba(0,255,255,0.15)]">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight font-outfit text-white">
              Proxy<span className="text-primary glow-text">LLM</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link href="/register" className="btn-neon text-sm px-5 py-2.5 font-bold">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 max-w-7xl mx-auto px-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text */}
          <div className="flex flex-col space-y-6 text-center lg:text-left">
            <div className="inline-flex self-center lg:self-start items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-primary font-semibold tracking-wide uppercase">
              <Zap className="w-3 h-3" />
              <span>Smart LLM Gateway</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-white font-outfit">
              Maximize Free AI <br />
              <span className="text-primary glow-text">API key rotation</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Connect multiple AI provider keys under a single unified endpoint. ProxyLLM handles automatic failover, smart load-balancing, and health monitoring completely in the background.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start pt-4">
              <Link href="/register" className="w-full sm:w-auto btn-neon font-bold text-base text-center">
                Start For Free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto btn-neon-outline font-semibold text-base text-center"
              >
                Access Console
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Glowing Visual Card */}
          <div className="relative flex justify-center items-center">
            {/* Pulsing Backlight */}
            <div className="absolute w-[350px] h-[350px] bg-cyan-500/20 rounded-full blur-[80px] animate-pulse pointer-events-none" />

            <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-white/[0.08] shadow-2xl relative z-10 animate-float">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="glow-dot-cyan" />
                  <span className="text-xs font-semibold text-slate-400">PROXY ENDPOINT ACTIVE</span>
                </div>
                <span className="text-[10px] bg-cyan-500/10 text-primary border border-cyan-500/20 rounded px-2 py-0.5 font-semibold">
                  v1/chat/completions
                </span>
              </div>

              {/* Rotated Keys Chain Graphic */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.05)]">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-white bg-slate-800 h-6 w-6 rounded-full flex items-center justify-center">1</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">OpenAI Key A</h4>
                      <p className="text-[10px] text-slate-400">Limit: 90% reached</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-2 py-0.5">
                    ROTATING...
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/40">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-primary bg-cyan-950 h-6 w-6 rounded-full flex items-center justify-center border border-cyan-500/20">2</span>
                    <div>
                      <h4 className="text-xs font-bold text-cyan-400">Gemini Key B</h4>
                      <p className="text-[10px] text-cyan-300/70">Health: 100% | Priority: 1</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5 opacity-50">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-900 h-6 w-6 rounded-full flex items-center justify-center">3</span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400">Claude Key A</h4>
                      <p className="text-[10px] text-slate-500">Standby</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-500/10 border border-white/5 rounded px-2 py-0.5">
                    STANDBY
                  </span>
                </div>
              </div>

              {/* Stats Footer in card */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5 text-center">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Success</p>
                  <p className="text-sm font-extrabold text-cyan-400">99.8%</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Avg Latency</p>
                  <p className="text-sm font-extrabold text-white">124ms</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Rotations</p>
                  <p className="text-sm font-extrabold text-white">4,812</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 relative max-w-7xl mx-auto px-6 z-10 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-outfit mb-4">
            Engineered for Resilient AI Integrations
          </h2>
          <p className="text-slate-400 text-base">
            Never let provider outages or rate limits impact your production application ever again.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-primary mb-4 border border-cyan-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Rotation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Dynamically cycles keys using Priority, Round Robin, or Weighted latency algorithms.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-primary mb-4 border border-cyan-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Failover</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Instantly intercepts 429 rate limits or 5xx outages and routes to backup keys seamlessly.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-primary mb-4 border border-cyan-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Detailed Analytics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Track latency curves, prompt token counts, success rates, and failover pathways in real-time.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-primary mb-4 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Unified Schema</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Fully OpenAI-compatible. Swapping is as simple as updating your client `baseURL`!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center text-slate-500 text-xs relative z-10">
        <p>© 2026 ProxyLLM. Tailored to enterprise aesthetics by ProvenPeak Solutions.</p>
      </footer>
    </div>
  );
}
