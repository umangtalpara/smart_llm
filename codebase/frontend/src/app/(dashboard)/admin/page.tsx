'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { ShieldAlert, Sliders, Users, Activity, RefreshCw } from 'lucide-react';
import { adminApi, AdminSystemStats, AdminProviderEntry, AdminUsersResponse } from '../../../services/api';
import { useAuthStore } from '../../../stores/auth';

import SystemMetricsTab from './components/system-metrics-tab';
import ProviderStatusTab from './components/provider-status-tab';
import UserAccountsTab from './components/user-accounts-tab';

type TabType = 'metrics' | 'providers' | 'users';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [userPage, setUserPage] = useState(1);
  const [days, setDays] = useState(30);

  // ─── Queries ───
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = useQuery<AdminSystemStats>({
    queryKey: ['admin-stats', days],
    queryFn: () => adminApi.getSystemStats(days),
    enabled: user?.role === 'admin',
    refetchInterval: 60_000,
  });

  const {
    data: providers,
    isLoading: providersLoading,
    refetch: refetchProviders,
  } = useQuery<AdminProviderEntry[]>({
    queryKey: ['admin-providers'],
    queryFn: adminApi.getProviders,
    enabled: user?.role === 'admin',
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery<AdminUsersResponse>({
    queryKey: ['admin-users', userPage],
    queryFn: () => adminApi.getUsers({ page: userPage, limit: 10 }),
    enabled: user?.role === 'admin',
  });

  // ─── Mutations ───
  const toggleProviderMutation = useMutation({
    mutationFn: ({ provider, status }: { provider: string; status: 'active' | 'inactive' }) =>
      adminApi.updateProviderStatus(provider, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-health'] });
    },
  });

  const toggleUserRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white font-outfit">Unauthorized Access</h2>
        <p className="text-sm text-slate-400 max-w-md">
          You must have administrator privileges to view this page. Use the role switcher in the sidebar to toggle admin privileges for local testing.
        </p>
      </div>
    );
  }

  const handleToggleProvider = (providerCode: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toggleProviderMutation.mutate({ provider: providerCode, status: nextStatus });
  };

  const handleToggleRole = (userId: string, currentRole: 'user' | 'admin') => {
    if (userId === user.id) return; // Prevent self-demotion
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    toggleUserRoleMutation.mutate({ id: userId, role: nextRole });
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-white tracking-tight">
            Admin <span className="text-primary glow-text">Control Panel</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage system-wide traffic, toggling providers, and user authorizations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'metrics') refetchStats();
              else if (activeTab === 'providers') refetchProviders();
              else refetchUsers();
            }}
            disabled={statsRefetching}
            className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-all disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statsRefetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="border-b border-white/5 flex gap-2">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          System Metrics
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === 'providers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Provider Status
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          User Accounts
        </button>
      </div>

      {/* ── Tabs Body Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'metrics' && (
          <SystemMetricsTab
            stats={stats}
            isLoading={statsLoading}
            days={days}
            setDays={setDays}
          />
        )}

        {activeTab === 'providers' && (
          <ProviderStatusTab
            providers={providers}
            isLoading={providersLoading}
            onToggle={handleToggleProvider}
            pendingProviderCode={toggleProviderMutation.variables?.provider}
            isPending={toggleProviderMutation.isPending}
          />
        )}

        {activeTab === 'users' && (
          <UserAccountsTab
            usersData={usersData}
            isLoading={usersLoading}
            page={userPage}
            setPage={setUserPage}
            onToggleRole={handleToggleRole}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
