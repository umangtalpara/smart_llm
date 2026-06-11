'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  code: number;
}

export default function StatusBadge({ code }: StatusBadgeProps) {
  const isSuccess = code >= 200 && code < 300;
  const isClientErr = code >= 400 && code < 500;

  const cls = isSuccess
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    : isClientErr
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    : 'bg-red-500/15 text-red-400 border-red-500/20';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${cls}`}>
      {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {code}
    </span>
  );
}
