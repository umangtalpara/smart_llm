'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth';
import {
  Shield,
  BarChart2,
  Key,
  FileText,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi, NotificationEntry } from '../../services/api';
import { api } from '../../services/api';
import { UserRole } from '../../../../shared/types';

interface Toast {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
    if (!isAuthenticated || !user) return;

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

        // Trigger float toast notification
        const toastId = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [
          ...prev,
          {
            id: toastId,
            title: newNotif.title,
            message: newNotif.message,
            severity: newNotif.severity,
          },
        ]);

        // Auto expire toast in 5 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 5000);
      } catch (err) {
        console.error('Error parsing notification event:', err);
      }
    };

    eventSource.onerror = (err) => {
      // Quietly log - EventSource automatically retries connections
      console.debug('SSE event source connection error or retry:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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

  // Developer Role Switcher (local test helpers)
  const handleToggleRoleDev = async () => {
    if (!user) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    
    // 1. Immediately toggle on client store
    useAuthStore.setState({
      user: { ...user, role: newRole as UserRole }
    });

    // 2. Try to update it on MongoDB for persistence
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
    } catch {
      console.debug('Role toggle API unauthorized/failed (expected if role was user), updating client role state.');
    }
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: BarChart2 },
    { name: 'API Keys', href: '/api-keys', icon: Key },
    { name: 'Request Logs', href: '/logs', icon: FileText },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin Panel', href: '/admin', icon: ShieldAlert });
  }

  // Helper colors for notification severity
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

  const toastIcons = {
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    critical: <ShieldAlert className="w-5.5 h-5.5 text-red-400 shrink-0 animate-bounce" />,
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-10 w-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-10 w-10 bg-cyan-500 flex items-center justify-center text-background">
              <Shield className="w-5 h-5 animate-pulse" />
            </span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row relative overflow-hidden">
      {/* Grid background effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card/30 border-r border-white/5 backdrop-blur-lg px-4 py-6 justify-between shrink-0 z-10">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3 px-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-primary shadow-[0_0_10px_rgba(0,255,255,0.15)]">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight font-outfit text-white">
              Proxy<span className="text-primary glow-text">LLM</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 h-12 rounded-lg text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-[inset_1px_0_10px_rgba(0,255,255,0.02)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          {/* Role switcher trigger */}
          <button
            onClick={handleToggleRoleDev}
            className="w-full h-8 flex items-center justify-center space-x-2 rounded-lg text-[10px] font-bold tracking-wider uppercase border border-cyan-500/10 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-slate-400 hover:text-primary transition-all duration-300"
            title="Click to toggle user/admin roles locally for testing"
          >
            <span>Role: <strong className="text-white">{user?.role}</strong></span>
          </button>

          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{user?.name}</span>
              <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full h-11 flex items-center space-x-3 px-4 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 h-16 bg-card/20 border-b border-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-base font-bold text-white tracking-tight font-outfit">ProxyLLM</span>
        </div>
        <div className="flex items-center space-x-3">
          {/* Bell Icon for Mobile */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white bg-white/[0.02] border border-white/5 transition-all"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-cyan-500 text-[9px] font-black text-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-30"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-72 max-w-[85vw] h-full bg-background border-r border-white/5 p-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 h-12 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary/10 text-primary border-l-2 border-primary'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                {/* Mobile role toggler */}
                <button
                  onClick={handleToggleRoleDev}
                  className="w-full h-8 flex items-center justify-center space-x-2 rounded-lg text-[10px] font-bold tracking-wider uppercase border border-cyan-500/10 bg-cyan-500/5 text-slate-400"
                >
                  <span>Role: <strong className="text-white">{user?.role}</strong></span>
                </button>

                <div className="flex items-center space-x-3 px-2">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{user?.name}</span>
                    <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full h-11 flex items-center space-x-3 px-4 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area + Desktop Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10">
        {/* Desktop Top Header with Notifications Bell */}
        <header className="hidden md:flex items-center justify-end px-10 h-16 bg-card/10 border-b border-white/5 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-4">
            
            {/* Bell Dropdown wrapper */}
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

              {/* Notification Popover Dropdown */}
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

                    {/* Inbox List */}
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
          </div>
        </header>

        {/* Outer scrolling container */}
        <div className="flex-1 overflow-y-auto">
          {/* Scrollable inner wrapper */}
          <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Floating Screenside Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-[90vw]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex gap-3 relative overflow-hidden bg-slate-950/95 ${
                t.severity === 'critical'
                  ? 'border-red-500/40 shadow-red-500/5'
                  : t.severity === 'warning'
                  ? 'border-amber-500/40 shadow-amber-500/5'
                  : 'border-cyan-500/40 shadow-cyan-500/5'
              }`}
            >
              {/* Sidebar border colored accent */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  t.severity === 'critical' ? 'bg-red-500' : t.severity === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
              />

              <div className="pl-1.5">{toastIcons[t.severity]}</div>
              <div className="flex-1 min-w-0 pr-4 space-y-0.5">
                <h4 className="text-xs font-extrabold text-white tracking-wide">{t.title}</h4>
                <p className="text-[10px] text-slate-300 leading-normal">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
