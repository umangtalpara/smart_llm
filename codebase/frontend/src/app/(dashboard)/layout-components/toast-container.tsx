'use client';

import React, { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationEntry } from '../../../services/api';

interface Toast {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleNewNotification = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationEntry>;
      const newNotif = customEvent.detail;
      const toastId = Math.random().toString(36).substring(2, 9);
      
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          title: newNotif.title,
          message: newNotif.message,
          severity: newNotif.severity,
        },
      ]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, []);

  const toastIcons = {
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    critical: <ShieldAlert className="w-5.5 h-5.5 text-red-400 shrink-0 animate-bounce" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-[90vw]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex gap-3 relative overflow-hidden bg-slate-950/95 ${
              t.severity === 'critical'
                ? 'border-red-500/40 shadow-red-500/5'
                : t.severity === 'warning'
                ? 'border-amber-500/40 shadow-amber-500/5'
                : 'border-cyan-500/40 shadow-cyan-500/5'
            }`}
          >
            {/* Sidebar border colored accent */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${
                t.severity === 'critical' ? 'bg-red-500' : t.severity === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
            />

            <div className="pl-1.5">{toastIcons[t.severity]}</div>
            <div className="flex-1 min-w-0 pr-4 space-y-0.5">
              <h4 className="text-xs font-extrabold text-white tracking-wide">{t.title}</h4>
              <p className="text-[10px] text-slate-300 leading-normal">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
