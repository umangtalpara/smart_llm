'use client';

import React, { useState } from 'react';
import { DeveloperToken } from '../../../../../../shared/types';
import { Key, Loader2, Copy, Check, Trash2, Eye, EyeOff } from 'lucide-react';

interface DeveloperTokensTableProps {
  tokens: DeveloperToken[];
  isLoading: boolean;
  copiedTokenId: string | null;
  onCopyTokenMask: (mask: string, id: string) => void;
  onRevoke: (id: string) => void;
}

export default function DeveloperTokensTable({
  tokens,
  isLoading,
  copiedTokenId,
  onCopyTokenMask,
  onRevoke,
}: DeveloperTokensTableProps) {
  const [revealedIds, setRevealedIds] = useState<string[]>([]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/5 p-4">
        <Key className="w-5 h-5 text-slate-600 mb-2" />
        <p className="text-[11px] text-slate-500">
          No access tokens generated yet. Generate one above to access LLM APIs.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-white/5 rounded-xl bg-white/[0.01]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase font-bold text-slate-400">
            <th className="p-3">Name</th>
            <th className="p-3">Token</th>
            <th className="p-3">Created</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-[11px] text-slate-300">
          {tokens.map((token) => {
            const isRevealed = revealedIds.includes(token.id);
            const valueToDisplay = isRevealed && token.rawToken ? token.rawToken : token.tokenMask;
            const valueToCopy = token.rawToken || token.tokenMask;

            return (
              <tr key={token.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-3 font-bold text-white max-w-[150px] truncate">{token.name}</td>
                <td className="p-3 font-mono text-cyan-400 select-all">
                  <div className="flex items-center space-x-2">
                    <span className="break-all">{valueToDisplay}</span>
                    
                    {/* Copy Button */}
                    <button
                      onClick={() => onCopyTokenMask(valueToCopy, token.id)}
                      className="p-1 rounded hover:bg-white/5 border border-transparent hover:border-white/5 text-slate-500 hover:text-white transition-all shrink-0"
                      title={token.rawToken ? "Copy full token" : "Copy token mask"}
                    >
                      {copiedTokenId === token.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Reveal/Hide Button */}
                    {token.rawToken && (
                      <button
                        onClick={() => toggleReveal(token.id)}
                        className="p-1 rounded hover:bg-white/5 border border-transparent hover:border-white/5 text-slate-500 hover:text-white transition-all shrink-0"
                        title={isRevealed ? "Hide token" : "Show full token"}
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-3 text-slate-400">
                  {new Date(token.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onRevoke(token.id)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                    title="Revoke Token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
