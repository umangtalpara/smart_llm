'use client';

import React from 'react';
import { ApiKey, ProviderCode, KeyStatus } from '../../../../../../shared/types';
import { ShieldCheck, ShieldAlert, Folder, Tag, Edit2, Trash2 } from 'lucide-react';

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (key: ApiKey) => void;
}

export default function ApiKeyCard({
  apiKey: key,
  onEdit,
  onDelete,
  onToggleStatus,
}: ApiKeyCardProps) {
  const getProviderStyle = (code: ProviderCode) => {
    switch (code) {
      case ProviderCode.OPENAI:
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case ProviderCode.GEMINI:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/25';
      case ProviderCode.CLAUDE:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case ProviderCode.GROQ:
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/25';
    }
  };

  return (
    <div
      className={`glass-card rounded-xl p-5 border transition-all duration-300 relative overflow-hidden ${
        key.status === KeyStatus.ACTIVE
          ? 'border-white/[0.08]'
          : 'opacity-50 border-white/5 bg-white/[0.01]'
      }`}
    >
      {/* Key Title and Provider tag */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{key.name}</h3>
          <code className="text-[10px] text-slate-400 font-mono select-all block">{key.keyMask}</code>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getProviderStyle(key.provider)}`}>
            {key.provider}
          </span>
          
          {/* Status toggle dot */}
          <button
            onClick={() => onToggleStatus(key)}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors focus:outline-none"
            title={key.status === KeyStatus.ACTIVE ? 'Disable Key' : 'Enable Key'}
          >
            {key.status === KeyStatus.ACTIVE ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Priority & Metrics */}
      <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-3 text-center my-3">
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Priority</p>
          <p className="text-xs font-extrabold text-white mt-0.5">{key.priority}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Success Rate</p>
          <p className="text-xs font-extrabold text-cyan-400 mt-0.5">
            {key.successCount + key.errorCount > 0
              ? `${Math.round((key.successCount / (key.successCount + key.errorCount)) * 100)}%`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Daily Caps</p>
          <p className="text-xs font-extrabold text-white mt-0.5">
            {key.dailyLimit > 0 ? `${key.dailyLimit} req` : 'Unlimited'}
          </p>
        </div>
      </div>

      {/* Tags & Groups */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <div className="flex items-center space-x-1.5 min-w-0">
          {key.group && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/5 max-w-[120px]">
              <Folder className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{key.group}</span>
            </div>
          )}
          {key.tags.slice(0, 2).map((tag) => (
            <div key={tag} className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 border border-white/5 max-w-[80px]">
              <Tag className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{tag}</span>
            </div>
          ))}
        </div>

        {/* Edit & Delete Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onEdit(key)}
            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all outline-none"
            aria-label="Edit Key"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(key.id)}
            className="h-8 w-8 flex items-center justify-center text-red-400/80 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all outline-none"
            aria-label="Delete Key"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
