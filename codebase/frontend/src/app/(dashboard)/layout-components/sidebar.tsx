'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, User as UserIcon, LogOut, BarChart2, Key, FileText, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../../../../../shared/types';
import { useAuthStore } from '../../../stores/auth';
import { api } from '../../../services/api';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

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
      console.debug('Role toggle API unauthorized/failed, updating client role state.');
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

  return (
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
          onClick={onLogout}
          className="w-full h-11 flex items-center space-x-3 px-4 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
export function MobileSidebar({
  user,
  onClose,
  onLogout,
}: {
  user: User | null;
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  const handleToggleRoleDev = async () => {
    if (!user) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    useAuthStore.setState({ user: { ...user, role: newRole as UserRole } });
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
    } catch {
      console.debug('Role toggle failed, updating client.');
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

  return (
    <div className="md:hidden fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-30">
      <div
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
                  onClick={onClose}
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
            onClick={onLogout}
            className="w-full h-11 flex items-center space-x-3 px-4 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
