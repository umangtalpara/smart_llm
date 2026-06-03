'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShieldAlert,
  Zap,
  CheckCircle2,
  Key,
  Clock,
  Sliders,
  Users,
  Activity,
  UserCheck,
  UserX,
  Power,
  RefreshCw,
} from 'lucide-react';
import { adminApi, AdminSystemStats, AdminProviderEntry, AdminUsersResponse } from '../../../services/api';
import { useAuthStore } from '../../../stores/auth';
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
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ─── Metric Card Component ───────────────────────────────────────────────────
interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accentClass: string;
  glowClass: string;
}

function AdminMetricCard({ title, value, subtitle, icon: Icon, accentClass, glowClass }: AdminMetricCardProps) {
  return (
    <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`w-10 h-10 rounded-xl ${accentClass} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className={`text-3xl font-extrabold font-outfit tracking-tight ${glowClass}`}>{value}</div>
        <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}

// ─── Chart Tooltip ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
      <p className="font-bold text-white mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400 capitalize">{entry.name}</span>
          <span className="font-semibold text-white ml-auto pl-4">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

type TabType = 'metrics' | 'providers' | 'users';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [userPage, setUserPage] = useState(1);
  const [days, setDays] = useState(30);

  // ─── Queries ───
  // System-wide aggregated stats
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

  // Providers list
  const {
    data: providers,
    isLoading: providersLoading,
    refetch: refetchProviders,
  } = useQuery<AdminProviderEntry[]>({
    queryKey: ['admin-providers'],
    queryFn: adminApi.getProviders,
    enabled: user?.role === 'admin',
  });

  // Users Directory List
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
  // Provider toggle mutation
  const toggleProviderMutation = useMutation({
    mutationFn: ({ provider, status }: { provider: string; status: 'active' | 'inactive' }) =>
      adminApi.updateProviderStatus(provider, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      // Invalidate health states as well
      queryClient.invalidateQueries({ queryKey: ['monitor-health'] });
    },
  });

  // User role toggle mutation
  const toggleUserRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Block unauthorized users from seeing view details
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

  const formattedChart = (stats?.chartData ?? []).map((d) => ({
    ...d,
    label: (() => {
      try {
        return format(parseISO(d.date), 'MMM d');
      } catch {
        return d.date;
      }
    })(),
  }));



  const providerLogos: Record<string, string> = {
    openai: 'bg-emerald-500/10 text-emerald-400',
    gemini: 'bg-purple-500/10 text-purple-400',
    claude: 'bg-blue-500/10 text-blue-400',
    groq: 'bg-orange-500/10 text-orange-400',
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
          <motion.div
            key="metrics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Aggregate Metric Cards */}
            {statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-6 min-h-[140px] animate-pulse" />
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
              >
                <AdminMetricCard
                  title="System Requests"
                  value={(stats?.metrics.totalRequests ?? 0).toLocaleString()}
                  subtitle="Total requests across all users"
                  icon={Zap}
                  accentClass="bg-cyan-500/10 text-primary"
                  glowClass="text-white"
                />
                <AdminMetricCard
                  title="Overall Success"
                  value={`${stats?.metrics.successRate ?? 100}%`}
                  subtitle="Success rate of proxy executions"
                  icon={CheckCircle2}
                  accentClass="bg-emerald-500/10 text-emerald-400"
                  glowClass="text-emerald-400"
                />
                <AdminMetricCard
                  title="Keys Registered"
                  value={`${stats?.metrics.activeKeys ?? 0} / ${stats?.metrics.totalKeys ?? 0}`}
                  subtitle="Active vs Total keys configured"
                  icon={Key}
                  accentClass="bg-purple-500/10 text-purple-400"
                  glowClass="text-white"
                />
                <AdminMetricCard
                  title="System Average Latency"
                  value={`${stats?.metrics.avgLatencyMs ?? 0}ms`}
                  subtitle="Average roundtrip latency"
                  icon={Clock}
                  accentClass="bg-amber-500/10 text-amber-400"
                  glowClass="text-white"
                />
              </motion.div>
            )}

            {/* aggregate Chart */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Global Traffic Charts
                </h2>
                <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  {([7, 14, 30] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[32px] ${
                        days === d
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Area chart */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Total System Throughput</h3>
                {statsLoading ? (
                  <div className="h-52 flex items-center justify-center text-slate-600 text-sm animate-pulse">Loading charts...</div>
                ) : formattedChart.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-slate-500 text-xs">No traffic data recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={formattedChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradSuccessSystem" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradFailedSystem" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="success" name="Success" stroke="#34d399" strokeWidth={2} fill="url(#gradSuccessSystem)" dot={false} />
                      <Area type="monotone" dataKey="failed" name="Failed" stroke="#f87171" strokeWidth={2} fill="url(#gradFailedSystem)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Global Providers Active / Inactive Status Panel */}
        {activeTab === 'providers' && (
          <motion.div
            key="providers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-base font-bold text-white font-outfit">AI Provider Global Toggles</h2>
              <p className="text-xs text-slate-400 mt-1">Disabling a provider globally blocks all key routing to it and returns 503 errors to proxy clients.</p>
            </div>

            {providersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-5 animate-pulse h-28" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers?.map((p) => {
                  const isActive = p.status === 'active';
                  const isMutating = toggleProviderMutation.isPending && toggleProviderMutation.variables?.provider === p.code;
                  return (
                    <div
                      key={p.code}
                      className={`glass-card rounded-xl p-5 border flex items-center justify-between transition-all duration-300 ${
                        isActive ? 'border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.01)]' : 'border-red-500/10 opacity-70'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-11 h-11 rounded-lg ${providerLogos[p.code] || 'bg-slate-800'} flex items-center justify-center font-bold text-sm shrink-0`}>
                          {p.name.substring(0, 2)}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-bold text-white font-outfit">{p.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isActive ? 'Active globally' : 'Disabled globally'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle switch */}
                      <button
                        onClick={() => handleToggleProvider(p.code, p.status)}
                        disabled={isMutating}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${
                          isActive ? 'bg-emerald-500' : 'bg-slate-800'
                        } ${isMutating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label={`Toggle global status for ${p.name}`}
                      >
                        <motion.div
                          layout
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-800 shadow"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          animate={{ x: isActive ? 24 : 0 }}
                        >
                          <Power className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                        </motion.div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* User accounts directory tab */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-base font-bold text-white font-outfit">User Account Directory</h2>
              <p className="text-xs text-slate-400 mt-1">List of registered user accounts and their system roles.</p>
            </div>

            {usersLoading ? (
              <div className="glass-card rounded-2xl p-6 h-60 animate-pulse" />
            ) : (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">User</th>
                          <th className="px-6 py-4">Created Date</th>
                          <th className="px-6 py-4">Verification</th>
                          <th className="px-6 py-4 text-right">Total Requests</th>
                          <th className="px-6 py-4">Current Role</th>
                          <th className="px-6 py-4 text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData?.data.map((u) => {
                          const dateString = (() => {
                            try {
                              return format(parseISO(u.createdAt), 'MMM d, yyyy');
                            } catch {
                              return u.createdAt;
                            }
                          })();

                          const isSelf = u.id === user.id;

                          return (
                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 select-none">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-white font-outfit">{u.name}</span>
                                    <span className="text-[10px] text-slate-500">{u.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-300 font-medium">{dateString}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                                  u.isVerified
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                }`}>
                                  {u.isVerified ? 'Verified' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-semibold text-white">
                                {u.totalRequests.toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                                  u.role === 'admin'
                                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                    : 'bg-slate-700/10 border-slate-700/20 text-slate-400'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isSelf ? (
                                  <span className="text-[10px] text-slate-500 italic pr-2">Your Account</span>
                                ) : (
                                  <button
                                    onClick={() => handleToggleRole(u.id, u.role)}
                                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all inline-flex items-center gap-1.5 min-h-[32px] ${
                                      u.role === 'admin'
                                        ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10'
                                        : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10'
                                    }`}
                                  >
                                    {u.role === 'admin' ? (
                                      <>
                                        <UserX className="w-3.5 h-3.5" />
                                        <span>Demote</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Promote</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Directory Pagination */}
                {usersData && usersData.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs text-slate-500">
                      Showing users {1 + (userPage - 1) * 10} - {Math.min(userPage * 10, usersData.total)} of {usersData.total}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                        disabled={userPage === 1}
                        className="px-3 h-9 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setUserPage((prev) => Math.min(usersData.totalPages, prev + 1))}
                        disabled={userPage === usersData.totalPages}
                        className="px-3 h-9 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
