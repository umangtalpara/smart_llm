'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { notificationsApi, NotificationsResponse } from '../../../services/api';
import NotificationItem from './components/notification-item';
import NotificationFilters, { SeverityFilter } from './components/notification-filters';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

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
      <NotificationFilters
        severity={severity}
        onSeverityChange={setSeverity}
        unreadOnly={unreadOnly}
        onUnreadOnlyChange={(u) => {
          setUnreadOnly(u);
          setPage(1);
        }}
      />

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
            {filteredNotifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                isPendingMarkAsRead={markAsReadMutation.isPending}
              />
            ))}
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
