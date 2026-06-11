'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { monitorApi, RequestLogEntry, LogsResponse } from '../../../services/api';
import { parseISO, formatDistanceToNow } from 'date-fns';

import StatusBadge from './components/status-badge';
import ProviderBadge from './components/provider-badge';
import SkeletonRow from './components/skeleton-row';
import FailoverDrawer, { formatDuration } from './components/failover-drawer';
import LogsFilters from './components/logs-filters';

export default function LogsPage() {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<RequestLogEntry | null>(null);
  const LIMIT = 20;

  const currentCursor = cursors[pageIndex];

  const { data, isLoading, isFetching, refetch } = useQuery<LogsResponse>({
    queryKey: ['monitor-logs', pageIndex, currentCursor, selectedProvider, selectedStatus],
    queryFn: () =>
      monitorApi.getLogs({
        cursor: currentCursor,
        limit: LIMIT,
        provider: selectedProvider,
        statusCode: selectedStatus,
      }),
    staleTime: 20_000,
  });

  const handleFilterChange = useCallback(() => {
    setCursors([undefined]);
    setPageIndex(0);
  }, []);

  const handleProviderFilter = (p: string | undefined) => {
    setSelectedProvider(p);
    handleFilterChange();
  };

  const handleStatusFilter = (s: number | undefined) => {
    setSelectedStatus(s);
    handleFilterChange();
  };

  const handleNextPage = () => {
    if (data?.hasNextPage && data.nextCursor) {
      setCursors((prev) => {
        const next = [...prev];
        next[pageIndex + 1] = data.nextCursor!;
        return next;
      });
      setPageIndex((prev) => prev + 1);
    }
  };
  //
  const handlePrevPage = () => {
    if (pageIndex > 0) {
      setPageIndex((prev) => prev - 1);
    }
  };

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      {/* Failover Drawer */}
      <FailoverDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-white tracking-tight">
              Request <span className="text-primary glow-text">Logs</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {total > 0
                ? `${total.toLocaleString()} requests logged`
                : 'All proxied request records with failover traces'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20 text-xs font-medium transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <LogsFilters
          selectedProvider={selectedProvider}
          handleProviderFilter={handleProviderFilter}
          selectedStatus={selectedStatus}
          handleStatusFilter={handleStatusFilter}
        />

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left">
                  {['Status', 'Provider', 'Model', 'Duration', 'Tokens', 'Time'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-600">
                        <FileText className="w-10 h-10 opacity-30" />
                        <span className="text-sm">No logs yet — make some proxy requests to see them here</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.3 }}
                      onClick={() => setSelectedLog(log)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge code={log.statusCode} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ProviderBadge provider={log.provider} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300 font-medium max-w-[160px] truncate">
                        {log.model || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-primary font-semibold whitespace-nowrap">
                        {formatDuration(log.durationMs)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {log.totalTokens.toLocaleString()}
                        {log.rotatedFromKeys.length > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-amber-400 text-[10px]">
                            <GitMerge className="w-3 h-3" />
                            {log.rotatedFromKeys.length} hop{log.rotatedFromKeys.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                        {(() => {
                          try {
                            return formatDistanceToNow(parseISO(log.createdAt), { addSuffix: true });
                          } catch {
                            return '—';
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3.5">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors" />
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <span className="text-white font-semibold">{pageIndex + 1}</span> of{' '}
              <span className="text-white font-semibold">{totalPages}</span> ·{' '}
              <span className="text-white font-semibold">{total.toLocaleString()}</span> total
            </span>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pageIndex === 0}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleNextPage}
                disabled={!data?.hasNextPage}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
