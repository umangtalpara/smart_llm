'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Info, AlertTriangle, ShieldAlert, CheckCircle, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi, NotificationEntry } from '../../../services/api';

export default function NotificationBell({ isAuthenticated, userId }: { isAuthenticated: boolean; userId?: string }) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Click outside listener for Bell Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SSE & Initial Fetch Connection
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Fetch initial notifications list
    const fetchInitialNotifications = async () => {
      try {
        const res = await notificationsApi.getNotifications({ page: 1, limit: 5 });
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    fetchInitialNotifications();

    // Establish SSE channel
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const sseUrl = `${apiBase}/notifications/sse?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data) as NotificationEntry;
        
        // Add to recent list and increment badge
        setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
        setUnreadCount((prev) => prev + 1);

        // Dispatch custom event for ToastContainer
        window.dispatchEvent(
          new CustomEvent<NotificationEntry>('new-notification', { detail: newNotif })
        );
      } catch (err) {
        console.error('Error parsing notification event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.debug('SSE event source connection error or retry:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, userId]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
      setBellOpen(false);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const severityIcons = {
    info: <Info className="w-4 h-4 text-cyan-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    critical: <ShieldAlert className="w-4.5 h-4.5 text-red-400" />,
  };

  const severityBorders = {
    info: 'border-cyan-500/20 bg-cyan-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    critical: 'border-red-500/20 bg-red-500/5',
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setBellOpen(!bellOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        aria-label="Toggle notifications menu"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-cyan-500 text-[9px] font-black text-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 max-w-[90vw] glass-card rounded-2xl border border-white/10 shadow-2xl p-4 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-bold text-white tracking-wide">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="my-3 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5">
                  <CheckCircle className="w-6 h-6 opacity-30 text-emerald-400" />
                  <span>No unread notifications</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border flex gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors relative group ${severityBorders[n.severity]}`}
                  >
                    <div className="shrink-0 pt-0.5">{severityIcons[n.severity]}</div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4 className="text-xs font-bold text-white leading-tight truncate pr-4">
                        {n.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                      title="Clear notification"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/5 text-center">
              <Link
                href="/notifications"
                onClick={() => setBellOpen(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 group"
              >
                <span>View Inbox History</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
