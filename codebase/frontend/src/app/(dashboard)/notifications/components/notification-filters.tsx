'use client';

import React from 'react';

export type SeverityFilter = 'all' | 'info' | 'warning' | 'critical';

interface NotificationFiltersProps {
  severity: SeverityFilter;
  onSeverityChange: (s: SeverityFilter) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (u: boolean) => void;
}

export default function NotificationFilters({
  severity,
  onSeverityChange,
  unreadOnly,
  onUnreadOnlyChange,
}: NotificationFiltersProps) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Severity:</span>
        {(['all', 'info', 'warning', 'critical'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onSeverityChange(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize border min-h-[32px] ${
              severity === s
                ? s === 'critical'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : s === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : s === 'info'
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-white/[0.01] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => onUnreadOnlyChange(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 focus:ring-2"
          />
          <span>Show Unread Only</span>
        </label>
      </div>
    </div>
  );
}
