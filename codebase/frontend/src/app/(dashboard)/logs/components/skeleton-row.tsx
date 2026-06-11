'use client';

import React from 'react';

export default function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04] animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 bg-white/[0.04] rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}
