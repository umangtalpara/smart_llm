'use client';

import React from 'react';
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
import { BarChart2, Activity, Clock } from 'lucide-react';
import { ChartDataPoint } from '../../../../services/api';
import CustomTooltip from './custom-tooltip';

const DAY_OPTIONS = [7, 14, 30] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

interface TrafficChartsProps {
  days: DayOption;
  setDays: (days: DayOption) => void;
  formattedChart: (ChartDataPoint & { label: string })[];
  isLoading: boolean;
}

export default function TrafficCharts({
  days,
  setDays,
  formattedChart,
  isLoading,
}: TrafficChartsProps) {
  return (
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
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Success
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Failed
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="h-52 flex items-center justify-center text-slate-600 text-sm animate-pulse">
            Loading chart data…
          </div>
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
        {isLoading ? (
          <div className="h-52 flex items-center justify-center text-slate-600 text-sm animate-pulse">
            Loading chart data…
          </div>
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
  );
}
