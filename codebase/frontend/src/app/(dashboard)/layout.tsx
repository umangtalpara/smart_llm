'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth';
import {
  Shield,
  BarChart2,
  Key,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: BarChart2 },
    { name: 'API Keys', href: '/api-keys', icon: Key },
    { name: 'Request Logs', href: '/logs', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card/30 border-r border-white/5 backdrop-blur-lg px-4 py-6 justify-between shrink-0">
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
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-500"
          aria-label="Open menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
