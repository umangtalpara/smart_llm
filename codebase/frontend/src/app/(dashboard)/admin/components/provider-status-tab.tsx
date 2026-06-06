'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Power } from 'lucide-react';
import { AdminProviderEntry } from '../../../../services/api';

const providerLogos: Record<string, string> = {
  openai: 'bg-emerald-500/10 text-emerald-400',
  gemini: 'bg-purple-500/10 text-purple-400',
  claude: 'bg-blue-500/10 text-blue-400',
  groq: 'bg-orange-500/10 text-orange-400',
  grok: 'bg-amber-500/10 text-amber-400',
  openrouter: 'bg-rose-500/10 text-rose-400',
  mistral: 'bg-orange-500/10 text-orange-400',
  cerebras: 'bg-violet-500/10 text-violet-400',
  cambercloud: 'bg-pink-500/10 text-pink-400',
};

interface ProviderStatusTabProps {
  providers?: AdminProviderEntry[];
  isLoading: boolean;
  onToggle: (providerCode: string, currentStatus: string) => void;
  pendingProviderCode?: string;
  isPending: boolean;
}

export default function ProviderStatusTab({
  providers,
  isLoading,
  onToggle,
  pendingProviderCode,
  isPending,
}: ProviderStatusTabProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white font-outfit">AI Provider Global Toggles</h2>
        <p className="text-xs text-slate-400 mt-1">
          Disabling a provider globally blocks all key routing to it and returns 503 errors to proxy clients.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers?.map((p) => {
          const isActive = p.status === 'active';
          const isMutating = isPending && pendingProviderCode === p.code;
          return (
            <div
              key={p.code}
              className={`glass-card rounded-xl p-5 border flex items-center justify-between transition-all duration-300 ${
                isActive
                  ? 'border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.01)]'
                  : 'border-red-500/10 opacity-70'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-11 h-11 rounded-lg ${
                    providerLogos[p.code] || 'bg-slate-800'
                  } flex items-center justify-center font-bold text-sm shrink-0`}
                >
                  {p.name.substring(0, 2)}
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white font-outfit">{p.name}</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                      }`}
                    />
                    <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isActive ? 'Active globally' : 'Disabled globally'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => onToggle(p.code, p.status)}
                disabled={isMutating}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${
                  isActive ? 'bg-emerald-500' : 'bg-slate-800'
                } ${isMutating ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={`Toggle global status for ${p.name}`}
              >
                <motion.div
                  layout
                  className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-800 shadow"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  animate={{ x: isActive ? 24 : 0 }}
                >
                  <Power className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                </motion.div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
