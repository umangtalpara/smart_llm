'use client';

import React from 'react';

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400 capitalize">{entry.name}</span>
          <span className="font-semibold text-white ml-auto pl-4">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
