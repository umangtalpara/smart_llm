'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth';
import { Shield, Menu, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Sidebar, { MobileSidebar } from './layout-components/sidebar';
import NotificationBell from './layout-components/notification-bell';
import ToastContainer from './layout-components/toast-container';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout, checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setHasChecked(true));
  }, [checkAuth]);

  useEffect(() => {
    if (hasChecked && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, hasChecked]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !isAuthenticated || !hasChecked) {
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
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 h-16 bg-card/20 border-b border-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-base font-bold text-white tracking-tight font-outfit">ProxyLLM</span>
        </div>
        <div className="flex items-center space-x-3">
          {/* Bell Icon for Mobile */}
          <NotificationBell isAuthenticated={isAuthenticated} userId={user?.id} />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div onClick={() => setMobileMenuOpen(false)}>
            <MobileSidebar
              user={user}
              onClose={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area + Desktop Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10">
        {/* Desktop Top Header with Notifications Bell */}
        <header className="hidden md:flex items-center justify-end px-10 h-16 bg-card/10 border-b border-white/5 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-4">
            <NotificationBell isAuthenticated={isAuthenticated} userId={user?.id} />
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
      <ToastContainer />
    </div>
  );
}
