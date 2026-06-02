'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Zap,
  CheckCircle2,
  Key,
  Coins,
  ArrowRight,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Activity,
  BarChart2,
  Clock,
  FileText,
} from 'lucide-react';
import { monitorApi, MetricsData, ChartDataPoint, HealthData } from '../../../services/api';
import { format, parseISO } from 'date-fns';

// ─── Animation Variants ───────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accentClass: string;
  glowClass: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, accentClass, glowClass }: MetricCardProps) {
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

// ─── Provider Health Badge ────────────────────────────────────────────────────
type HealthStatus = 'healthy' | 'degraded' | 'down' | 'inactive';

const healthConfig: Record<HealthStatus, { dot: string; text: string; bg: string; border: string; icon: React.ElementType }> = {
  healthy: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Wifi },
  degraded: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle },
  down: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: WifiOff },
  inactive: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: WifiOff },
};

const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  claude: 'Claude',
  groq: 'Groq',
};

const providerColors: Record<string, string> = {
  openai: 'text-emerald-400',
  gemini: 'text-purple-400',
  claude: 'text-blue-400',
  groq: 'text-orange-400',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
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

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-6 min-h-[140px] animate-pulse">
      <div className="h-3 bg-white/5 rounded w-2/3 mb-auto" />
      <div className="mt-8 h-8 bg-white/5 rounded w-1/2" />
      <div className="mt-2 h-2 bg-white/5 rounded w-3/4" />
    </div>
  );
}

// ─── Day Range Toggle ────────────────────────────────────────────────────────
const DAY_OPTIONS = [7, 14, 30] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const [days, setDays] = useState<DayOption>(30);

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
    isRefetching: metricsRefetching,
  } = useQuery<MetricsData>({
    queryKey: ['monitor-metrics'],
    queryFn: monitorApi.getMetrics,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const {
    data: chartData,
    isLoading: chartsLoading,
  } = useQuery<ChartDataPoint[]>({
    queryKey: ['monitor-charts', days],
    queryFn: () => monitorApi.getCharts(days),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ['monitor-health'],
    queryFn: monitorApi.getHealth,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const formattedChart = (chartData ?? []).map((d) => ({
    ...d,
    label: (() => {
      try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; }
    })(),
  }));

  return (
    <div className="space-y-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-white tracking-tight">
            Analytics <span className="text-primary glow-text">Overview</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time gateway metrics, throughput, and provider health</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/logs" className="btn-neon-outline text-xs px-4 py-2.5 inline-flex items-center gap-2 min-h-[44px]">
            <FileText className="w-3.5 h-3.5" />
            <span>View Logs</span>
          </Link>
          <button
            onClick={() => refetchMetrics()}
            disabled={metricsRefetching}
            className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${metricsRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
        >
          <MetricCard
            title="Total Requests"
            value={(metrics?.totalRequests ?? 0).toLocaleString()}
            subtitle="All-time proxied requests"
            icon={Zap}
            accentClass="bg-cyan-500/10 text-primary"
            glowClass="text-white"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics?.successRate ?? 100}%`}
            subtitle="Successful completions"
            icon={CheckCircle2}
            accentClass="bg-emerald-500/10 text-emerald-400"
            glowClass={
              (metrics?.successRate ?? 100) >= 90
                ? 'text-emerald-400'
                : (metrics?.successRate ?? 100) >= 70
                ? 'text-amber-400'
                : 'text-red-400'
            }
          />
          <MetricCard
            title="Active API Keys"
            value={metrics?.activeKeys ?? 0}
            subtitle="Keys currently active"
            icon={Key}
            accentClass="bg-purple-500/10 text-purple-400"
            glowClass="text-white"
          />
          <MetricCard
            title="Total Tokens"
            value={
              (metrics?.totalTokens ?? 0) >= 1_000_000
                ? `${((metrics?.totalTokens ?? 0) / 1_000_000).toFixed(1)}M`
                : (metrics?.totalTokens ?? 0) >= 1_000
                ? `${((metrics?.totalTokens ?? 0) / 1_000).toFixed(1)}K`
                : String(metrics?.totalTokens ?? 0)
            }
            subtitle="All-time tokens processed"
            icon={Coins}
            accentClass="bg-amber-500/10 text-amber-400"
            glowClass="text-white"
          />
        </motion.div>
      )}

      {/* ── Charts Section ── */}
      <div className="space-y-6">
        {/* Day range selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-white">Traffic Analytics</h2>
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            {DAY_OPTIONS.map((d) => (
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

        {/* Throughput area chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Request Throughput</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Success vs Failed requests per day</p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Success</span>
              <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Failed</span>
            </div>
          </div>
          {chartsLoading ? (
            <div className="h-52 flex items-center justify-center text-slate-600 text-sm animate-pulse">Loading chart data…</div>
          ) : formattedChart.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-600 gap-2">
              <Activity className="w-8 h-8 opacity-30" />
              <span className="text-sm">No data yet — make some proxy requests to see charts</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={formattedChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="success" stroke="#34d399" strokeWidth={2} fill="url(#gradSuccess)" dot={false} />
                <Area type="monotone" dataKey="failed" stroke="#f87171" strokeWidth={2} fill="url(#gradFailed)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Avg Latency line chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Average Latency</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Mean response time per successful request (ms)</p>
            </div>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          {chartsLoading ? (
            <div className="h-52 flex items-center justify-center text-slate-600 text-sm animate-pulse">Loading chart data…</div>
          ) : formattedChart.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-600 gap-2">
              <Clock className="w-8 h-8 opacity-30" />
              <span className="text-sm">No latency data yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={formattedChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Line
                  type="monotone"
                  dataKey="avgLatencyMs"
                  name="Avg Latency (ms)"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#22d3ee', stroke: 'rgba(34,211,238,0.3)', strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* ── Provider Health ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-white">Provider Health</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthLoading
            ? ['openai', 'gemini', 'claude', 'groq'].map((p) => (
                <div key={p} className="glass-card rounded-xl p-5 animate-pulse h-28" />
              ))
            : health
            ? (Object.entries(health) as [keyof HealthData, HealthData[keyof HealthData]][]).map(
                ([provider, info]) => {
                  const cfg = healthConfig[info.status] ?? healthConfig.inactive;
                  const StatusIcon = cfg.icon;
                  return (
                    <div
                      key={provider}
                      className={`glass-card rounded-xl p-5 border ${cfg.border} flex flex-col gap-3`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider ${providerColors[provider] ?? 'text-slate-300'}`}>
                          {providerLabels[provider] ?? provider}
                        </span>
                        <StatusIcon className={`w-4 h-4 ${cfg.text}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot} shadow-lg`} />
                        <span className={`text-sm font-semibold ${cfg.text}`}>{info.label}</span>
                      </div>
                      <div className="flex gap-4 text-[11px] text-slate-500">
                        <span>Active: <span className="text-white font-medium">{info.activeKeys}</span></span>
                        <span>Cooldown: <span className="text-amber-400 font-medium">{info.cooldownKeys}</span></span>
                      </div>
                    </div>
                  );
                }
              )
            : null}
        </div>
      </motion.div>

      {/* ── Quick Action ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex justify-end"
      >
        <Link
          href="/logs"
          className="btn-neon text-xs font-bold px-5 py-3 inline-flex items-center gap-2 min-h-[44px]"
        >
          <span>View Full Request Logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

    </div>
  );
}
