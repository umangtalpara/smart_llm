'use client';

import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-6 min-h-[140px] animate-pulse">
      <div className="h-3 bg-white/5 rounded w-2/3 mb-auto" />
      <div className="mt-8 h-8 bg-white/5 rounded w-1/2" />
      <div className="mt-2 h-2 bg-white/5 rounded w-3/4" />
    </div>
  );
}
