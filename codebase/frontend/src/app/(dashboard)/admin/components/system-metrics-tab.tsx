'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, CheckCircle2, Key, Clock, Activity } from 'lucide-react';
import { AdminSystemStats } from '../../../../services/api';
import { format, parseISO } from 'date-fns';
import AdminMetricCard from './admin-metric-card';
import ChartTooltip from './chart-tooltip';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

interface SystemMetricsTabProps {
  stats?: AdminSystemStats;
  isLoading: boolean;
  days: number;
  setDays: (days: number) => void;
}

export default function SystemMetricsTab({
  stats,
  isLoading,
  days,
  setDays,
}: SystemMetricsTabProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 min-h-[140px]" />
          ))}
        </div>
        <div className="glass-card rounded-2xl p-6 h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Aggregate Metric Cards */}
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

      {/* Aggregate Chart */}
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
          {formattedChart.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-500 text-xs">
              No traffic data recorded.
            </div>
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
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="success" name="Success" stroke="#34d399" strokeWidth={2} fill="url(#gradSuccessSystem)" dot={false} />
                <Area type="monotone" dataKey="failed" name="Failed" stroke="#f87171" strokeWidth={2} fill="url(#gradFailedSystem)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
