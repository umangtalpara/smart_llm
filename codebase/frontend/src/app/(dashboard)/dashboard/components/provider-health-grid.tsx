'use client';

import React from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { HealthData } from '../../../../services/api';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'inactive';

const healthConfig: Record<
  HealthStatus,
  { dot: string; text: string; bg: string; border: string; icon: React.ElementType }
> = {
  healthy: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Wifi },
  degraded: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle },
  down: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: WifiOff },
  inactive: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: WifiOff },
};

const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  claude: 'Claude',
  groq: 'Groq',
  github: 'GitHub Models',
};

const providerColors: Record<string, string> = {
  openai: 'text-emerald-400',
  gemini: 'text-purple-400',
  claude: 'text-blue-400',
  groq: 'text-orange-400',
  github: 'text-sky-400',
};

interface ProviderHealthGridProps {
  health?: HealthData;
  isLoading: boolean;
}

export default function ProviderHealthGrid({ health, isLoading }: ProviderHealthGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {['openai', 'gemini', 'claude', 'groq', 'github'].map((p) => (
          <div key={p} className="glass-card rounded-xl p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {(Object.entries(health) as [keyof HealthData, HealthData[keyof HealthData]][]).map(
        ([provider, info]) => {
          const cfg = healthConfig[info.status] ?? healthConfig.inactive;
          const StatusIcon = cfg.icon;
          return (
            <div
              key={provider}
              className={`glass-card rounded-xl p-5 border ${cfg.border} flex flex-col gap-3`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${providerColors[provider] ?? 'text-slate-300'}`}>
                  {providerLabels[provider] ?? provider}
                </span>
                <StatusIcon className={`w-4 h-4 ${cfg.text}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot} shadow-lg`} />
                <span className={`text-sm font-semibold ${cfg.text}`}>{info.label}</span>
              </div>
              <div className="flex gap-4 text-[11px] text-slate-500">
                <span>Active: <span className="text-white font-medium">{info.activeKeys}</span></span>
                <span>Cooldown: <span className="text-amber-400 font-medium">{info.cooldownKeys}</span></span>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
