'use client';

import React from 'react';
import { UserX, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AdminUsersResponse } from '../../../../services/api';

interface UserAccountsTabProps {
  usersData?: AdminUsersResponse;
  isLoading: boolean;
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  onToggleRole: (userId: string, currentRole: 'user' | 'admin') => void;
  currentUserId?: string;
}

export default function UserAccountsTab({
  usersData,
  isLoading,
  page,
  setPage,
  onToggleRole,
  currentUserId,
}: UserAccountsTabProps) {
  if (isLoading) {
    return <div className="glass-card rounded-2xl p-6 h-60 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white font-outfit">User Account Directory</h2>
        <p className="text-xs text-slate-400 mt-1">List of registered user accounts and their system roles.</p>
      </div>

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

                  const isSelf = u.id === currentUserId;

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
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                            u.isVerified
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}
                        >
                          {u.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">
                        {u.totalRequests.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                              : 'bg-slate-700/10 border-slate-700/20 text-slate-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isSelf ? (
                          <span className="text-[10px] text-slate-500 italic pr-2">Your Account</span>
                        ) : (
                          <button
                            onClick={() => onToggleRole(u.id, u.role)}
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
              Showing users {1 + (page - 1) * 10} - {Math.min(page * 10, usersData.total)} of {usersData.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 h-9 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(usersData.totalPages, prev + 1))}
                disabled={page === usersData.totalPages}
                className="px-3 h-9 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
