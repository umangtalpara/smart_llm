'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { notificationsApi, NotificationsResponse } from '../../../services/api';
import { format, parseISO } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type SeverityFilter = 'all' | 'info' | 'warning' | 'critical';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severity, setSeverity] = useState<SeverityFilter>('all');

  const {
    data: notificationsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => notificationsApi.getNotifications({ page, limit: 10, unreadOnly }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Filter in memory for severity since severity filtering isn't done on backend query (keeps pagination simple)
  const filteredNotifications = (notificationsData?.data ?? []).filter((n) => {
    if (severity === 'all') return true;
    return n.severity === severity;
  });

  const severityIcons = {
    info: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    critical: <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0" />,
  };

  const severityClasses = {
    info: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    critical: 'border-red-500/20 bg-red-500/5 text-red-400',
  };

  const severityBadge = {
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-white tracking-tight">
            Notifications <span className="text-primary glow-text">Inbox</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Audit log of system-wide warnings, cooldowns, and critical status updates</p>
        </div>
        <div className="flex items-center gap-3">
          {notificationsData && notificationsData.unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold transition-all disabled:opacity-50 min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-all disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Severity:</span>
          {(['all', 'info', 'warning', 'critical'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
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
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-white/10 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 focus:ring-2"
            />
            <span>Show Unread Only</span>
          </label>
        </div>
      </div>

      {/* ── Notifications Inbox List ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 h-28 animate-pulse" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl py-16 text-center max-w-lg mx-auto flex flex-col items-center justify-center gap-3"
        >
          <Bell className="w-12 h-12 text-slate-600 opacity-40 animate-pulse" />
          <h3 className="text-base font-bold text-white font-outfit">Inbox is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {unreadOnly
              ? "You do not have any unread notifications currently."
              : "No system alerts have been triggered yet. Everything is running smoothly."}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((n) => {
              const formattedDate = (() => {
                try {
                  return format(parseISO(n.createdAt), 'MMM d, yyyy h:mm a');
                } catch {
                  return n.createdAt;
                }
              })();

              return (
                <motion.div
                  key={n.id}
                  variants={itemVariants}
                  exit={{ opacity: 0, x: -30 }}
                  className={`glass-card rounded-2xl p-6 border flex gap-4 transition-all relative overflow-hidden group ${
                    n.read ? 'border-white/5 opacity-70' : 'border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.01)]'
                  } ${severityClasses[n.severity]}`}
                >
                  {/* Left status colored bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      n.severity === 'critical'
                        ? 'bg-red-500'
                        : n.severity === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                  />

                  {/* Icon */}
                  <div className="shrink-0 p-1 bg-white/[0.02] border border-white/5 rounded-xl h-10 w-10 flex items-center justify-center">
                    {severityIcons[n.severity]}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white font-outfit">{n.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider select-none ${severityBadge[n.severity]}`}>
                          {n.severity}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{n.message}</p>
                    
                    {/* Metadata display if exists */}
                    {n.metadata && Object.keys(n.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 bg-black/10 rounded-lg p-2 max-w-fit border border-white/5">
                        {Object.entries(n.metadata).map(([k, v]) => (
                          <span key={k}>
                            <strong className="text-slate-400 capitalize">{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-medium">{formattedDate}</div>
                  </div>

                  {/* Actions */}
                  {!n.read && (
                    <div className="flex items-start">
                      <button
                        onClick={() => markAsReadMutation.mutate(n.id)}
                        disabled={markAsReadMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase transition-all min-h-[32px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Pagination Controls ── */}
      {notificationsData && notificationsData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <span className="text-xs text-slate-500 font-semibold">
            Page {page} of {notificationsData.totalPages} ({notificationsData.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(notificationsData.totalPages, prev + 1))}
              disabled={page === notificationsData.totalPages}
              className="p-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
