'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, ShieldAlert, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { NotificationEntry } from '../../../../services/api';

interface NotificationItemProps {
  notification: NotificationEntry;
  onMarkAsRead: (id: string) => void;
  isPendingMarkAsRead: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function NotificationItem({
  notification: n,
  onMarkAsRead,
  isPendingMarkAsRead,
}: NotificationItemProps) {
  const formattedDate = (() => {
    try {
      return format(parseISO(n.createdAt), 'MMM d, yyyy h:mm a');
    } catch {
      return n.createdAt;
    }
  })();

  const severityIcons = {
    info: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    critical: <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0" />,
  };

  const severityClasses = {
    info: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    critical: 'border-red-500/20 bg-red-500/5 text-red-400',
  };

  const severityBadge = {
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <motion.div
      variants={itemVariants}
      exit={{ opacity: 0, x: -30 }}
      className={`glass-card rounded-2xl p-6 border flex gap-4 transition-all relative overflow-hidden group ${
        n.read ? 'border-white/5 opacity-70' : 'border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.01)]'
      } ${severityClasses[n.severity]}`}
    >
      {/* Left status colored bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          n.severity === 'critical'
            ? 'bg-red-500'
            : n.severity === 'warning'
            ? 'bg-amber-500'
            : 'bg-cyan-500'
        }`}
      />

      {/* Icon */}
      <div className="shrink-0 p-1 bg-white/[0.02] border border-white/5 rounded-xl h-10 w-10 flex items-center justify-center">
        {severityIcons[n.severity]}
      </div>

      {/* Body Content */}
      <div className="flex-1 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h3 className="text-sm font-extrabold text-white font-outfit">{n.title}</h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider select-none ${severityBadge[n.severity]}`}>
              {n.severity}
            </span>
            {!n.read && (
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{n.message}</p>
        
        {/* Metadata display if exists */}
        {n.metadata && Object.keys(n.metadata).length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 bg-black/10 rounded-lg p-2 max-w-fit border border-white/5">
            {Object.entries(n.metadata).map(([k, v]) => (
              <span key={k}>
                <strong className="text-slate-400 capitalize">{k}:</strong> {String(v)}
              </span>
            ))}
          </div>
        )}

        <div className="text-[10px] text-slate-500 font-medium">{formattedDate}</div>
      </div>

      {/* Actions */}
      {!n.read && (
        <div className="flex items-start">
          <button
            onClick={() => onMarkAsRead(n.id)}
            disabled={isPendingMarkAsRead}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase transition-all min-h-[32px]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
