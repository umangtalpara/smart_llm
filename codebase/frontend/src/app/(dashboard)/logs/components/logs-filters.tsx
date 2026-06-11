'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { PROVIDERS, providerConfig } from './provider-badge';

const STATUS_FILTERS = [200, 400, 401, 429, 500] as const;

interface LogsFiltersProps {
  selectedProvider?: string;
  handleProviderFilter: (p: string | undefined) => void;
  selectedStatus?: number;
  handleStatusFilter: (s: number | undefined) => void;
}

export default function LogsFilters({
  selectedProvider,
  handleProviderFilter,
  selectedStatus,
  handleStatusFilter,
}: LogsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter:</span>
      </div>

      {/* Provider filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleProviderFilter(undefined)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[32px] ${
            !selectedProvider
              ? 'bg-primary/20 text-primary border-primary/30'
              : 'text-slate-400 border-white/10 hover:text-white hover:border-white/20'
          }`}
        >
          All Providers
        </button>
        {PROVIDERS.map((p) => {
          const cfg = providerConfig[p];
          return (
            <button
              key={p}
              onClick={() => handleProviderFilter(selectedProvider === p ? undefined : p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[32px] ${
                selectedProvider === p
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : 'text-slate-400 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="w-px h-5 bg-white/10 hidden sm:block" />

      {/* Status code filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleStatusFilter(undefined)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[32px] ${
            !selectedStatus
              ? 'bg-primary/20 text-primary border-primary/30'
              : 'text-slate-400 border-white/10 hover:text-white hover:border-white/20'
          }`}
        >
          All Codes
        </button>
        {STATUS_FILTERS.map((code) => (
          <button
            key={code}
            onClick={() => handleStatusFilter(selectedStatus === code ? undefined : code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all min-h-[32px] ${
              selectedStatus === code
                ? code < 300
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : code < 500
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'text-slate-400 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}
