'use client';

import React from 'react';
import { motion } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accentClass: string;
  glowClass: string;
}

export default function AdminMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentClass,
  glowClass,
}: AdminMetricCardProps) {
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
