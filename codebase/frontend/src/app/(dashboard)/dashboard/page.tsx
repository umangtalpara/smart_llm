'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  Key,
  Coins,
  ArrowRight,
  RefreshCw,
  Wifi,
  FileText,
} from 'lucide-react';
import { monitorApi, MetricsData, ChartDataPoint, HealthData } from '../../../services/api';
import { format, parseISO } from 'date-fns';

import MetricCard from './components/metric-card';
import SkeletonCard from './components/skeleton-card';
import TrafficCharts from './components/traffic-charts';
import ProviderHealthGrid from './components/provider-health-grid';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

type DayOption = 7 | 14 | 30;

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
      try {
        return format(parseISO(d.date), 'MMM d');
      } catch {
        return d.date;
      }
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
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
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
      <TrafficCharts
        days={days}
        setDays={setDays}
        formattedChart={formattedChart}
        isLoading={chartsLoading}
      />

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
        <ProviderHealthGrid health={health} isLoading={healthLoading} />
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
