'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, GitMerge, CheckCircle2, Clock, Cpu } from 'lucide-react';
import { RequestLogEntry } from '../../../../services/api';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import ProviderBadge, { providerConfig, Provider } from './provider-badge';
import StatusBadge from './status-badge';

interface FailoverDrawerProps {
  log: RequestLogEntry | null;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function FailoverDrawer({ log, onClose }: FailoverDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {log && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 bg-[hsl(222,47%,7%)] border-l border-white/[0.07] flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-white">Request Detail</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close drawer"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Summary */}
              <div className="glass-card rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Summary</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Provider</span>
                    <div className="mt-1">
                      <ProviderBadge provider={log.provider} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Status</span>
                    <div className="mt-1">
                      <StatusBadge code={log.statusCode} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Model</span>
                    <p className="text-white font-medium mt-0.5 truncate">{log.model || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Endpoint</span>
                    <p className="text-white font-medium mt-0.5 font-mono text-[11px]">{log.path}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Duration</span>
                    <p className="text-primary font-bold mt-0.5">{formatDuration(log.durationMs)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Requested</span>
                    <p className="text-white font-medium mt-0.5 text-[11px]">
                      {(() => {
                        try {
                          return formatDistanceToNow(parseISO(log.createdAt), { addSuffix: true });
                        } catch {
                          return '—';
                        }
                      })()}
                    </p>
                  </div>
                </div>
                {log.errorMsg && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-red-400 font-semibold">Error Message</p>
                    <p className="text-xs text-red-300 mt-0.5">{log.errorMsg}</p>
                  </div>
                )}
              </div>

              {/* Token Usage */}
              <div className="glass-card rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Token Usage
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Prompt', value: log.promptTokens },
                    { label: 'Completion', value: log.completionTokens },
                    { label: 'Total', value: log.totalTokens },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.05]">
                      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
                      <p className="text-lg font-bold text-white font-outfit mt-0.5">{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Failover Trace */}
              <div className="glass-card rounded-xl p-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5" /> Failover Trace
                </p>
                {log.rotatedFromKeys.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>No failover — request succeeded on first attempt.</span>
                  </div>
                ) : (
                  <div className="relative pl-5">
                    {/* Vertical connector line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-500/60 via-amber-500/30 to-transparent" />

                    <div className="space-y-3">
                      {log.rotatedFromKeys.map((keyId, idx) => (
                        <div key={keyId} className="flex items-start gap-3 relative">
                          <span className="absolute -left-5 top-[5px] w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[9px] font-bold text-amber-400">
                            {idx + 1}
                          </span>
                          <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-3 py-2 flex-1">
                            <p className="text-[10px] text-amber-400 font-semibold">Rotated Away (Attempt {idx + 1})</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{keyId}</p>
                          </div>
                        </div>
                      ))}

                      {/* Final success hop */}
                      <div className="flex items-start gap-3 relative">
                        <span className="absolute -left-5 top-[5px] w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        </span>
                        <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg px-3 py-2 flex-1">
                          <p className="text-[10px] text-emerald-400 font-semibold">
                            {log.statusCode >= 200 && log.statusCode < 300
                              ? `Final Response — ${log.statusCode} OK`
                              : `Final Response — ${log.statusCode}`}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            via {providerConfig[log.provider as Provider]?.label ?? log.provider}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timing */}
              <div className="glass-card rounded-xl p-5 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Timing
                </p>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Created At</span>
                    <span className="text-white font-medium">
                      {format(parseISO(log.createdAt), 'MMM d, yyyy — HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time</span>
                    <span className="text-primary font-bold">{formatDuration(log.durationMs)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
export { formatDuration };
