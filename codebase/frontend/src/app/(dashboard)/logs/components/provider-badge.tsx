'use client';

import React from 'react';

const PROVIDERS = ['openai', 'gemini', 'claude', 'groq', 'github'] as const;
type Provider = (typeof PROVIDERS)[number];

const providerConfig: Record<Provider, { label: string; color: string; bg: string; border: string }> = {
  openai: { label: 'OpenAI', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  gemini: { label: 'Gemini', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  claude: { label: 'Claude', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  groq: { label: 'Groq', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  github: { label: 'GitHub Models', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
};

interface ProviderBadgeProps {
  provider: string;
}

export default function ProviderBadge({ provider }: ProviderBadgeProps) {
  const cfg = providerConfig[provider as Provider] ?? {
    label: provider,
    color: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}
export { providerConfig, PROVIDERS };
export type { Provider };
