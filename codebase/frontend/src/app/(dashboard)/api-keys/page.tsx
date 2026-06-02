'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { ApiKey, ProviderCode, KeyStatus } from '../../../../../shared/types';
import {
  Key,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  X,
  Sliders,
  Settings2,
  Folder,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ProviderCode>(ProviderCode.OPENAI);
  const [apiKeyVal, setApiKeyVal] = useState('');
  const [dailyLimit, setDailyLimit] = useState(0);
  const [rpmLimit, setRpmLimit] = useState(0);
  const [tpmLimit, setTpmLimit] = useState(0);
  const [priority, setPriority] = useState(1);
  const [tags, setTags] = useState<string>('');
  const [group, setGroup] = useState<string>('');

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api-keys');
      setKeys(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch API Keys.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const openAddModal = () => {
    setEditingKey(null);
    setName('');
    setProvider(ProviderCode.OPENAI);
    setApiKeyVal('');
    setDailyLimit(0);
    setRpmLimit(0);
    setTpmLimit(0);
    setPriority(1);
    setTags('');
    setGroup('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (key: ApiKey) => {
    setEditingKey(key);
    setName(key.name);
    setProvider(key.provider);
    setApiKeyVal(''); // Don't populate unencrypted key
    setDailyLimit(key.dailyLimit);
    setRpmLimit(key.rpmLimit);
    setTpmLimit(key.tpmLimit);
    setPriority(key.priority);
    setTags(key.tags.join(', '));
    setGroup(key.group || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name) {
      setError('Please provide a key name.');
      setIsSubmitting(false);
      return;
    }

    if (!editingKey && !apiKeyVal) {
      setError('Please provide the raw API Key value.');
      setIsSubmitting(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      name,
      provider,
      dailyLimit: Number(dailyLimit),
      rpmLimit: Number(rpmLimit),
      tpmLimit: Number(tpmLimit),
      priority: Number(priority),
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      group: group || undefined,
    };

    if (apiKeyVal) {
      payload.apiKey = apiKeyVal;
    }

    try {
      if (editingKey) {
        await api.patch(`/api-keys/${editingKey.id}`, payload);
        setSuccessMsg('API Key successfully updated and connectivity verified!');
      } else {
        await api.post('/api-keys', payload);
        setSuccessMsg('API Key successfully registered and cryptographically secured!');
      }
      setModalOpen(false);
      fetchKeys();
      
      // Auto clear success toast
      setTimeout(() => setSuccessMsg(null), 4000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed. Please check key validity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this API Key? This action is irreversible.')) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/api-keys/${id}`);
      setSuccessMsg('API Key permanently deleted.');
      fetchKeys();
      setTimeout(() => setSuccessMsg(null), 3000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleToggleStatus = async (key: ApiKey) => {
    const nextStatus = key.status === KeyStatus.ACTIVE ? KeyStatus.INACTIVE : KeyStatus.ACTIVE;
    try {
      await api.patch(`/api-keys/${key.id}`, { status: nextStatus });
      fetchKeys();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Status toggle failed.');
    }
  };

  const getProviderStyle = (code: ProviderCode) => {
    switch (code) {
      case ProviderCode.OPENAI:
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case ProviderCode.GEMINI:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/25';
      case ProviderCode.CLAUDE:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case ProviderCode.GROQ:
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/25';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-white">
            Provider <span className="text-primary glow-text">API Keys</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Securely register, prioritize, and track limits of your AI provider keys.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn-neon font-bold text-xs h-11 px-5 flex items-center justify-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add API Key</span>
        </button>
      </div>

      {/* Success/Error toasts */}
      {successMsg && (
        <div className="p-4 text-xs font-semibold text-emerald-200 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-center backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          {successMsg}
        </div>
      )}

      {/* Keys List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-slate-400 text-xs font-semibold">Decrypting secure masks...</span>
        </div>
      ) : keys.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center text-slate-500">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">No keys registered yet</h3>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
            API keys must be configured to start proxy routing. Registered keys are stored securely using strong **AES-256-GCM** encryption.
          </p>
          <button onClick={openAddModal} className="btn-neon text-xs font-bold mt-2">
            Register First Key
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`glass-card rounded-xl p-5 border transition-all duration-300 relative overflow-hidden ${
                key.status === KeyStatus.ACTIVE
                  ? 'border-white/[0.08]'
                  : 'opacity-50 border-white/5 bg-white/[0.01]'
              }`}
            >
              {/* Key Title and Provider tag */}
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{key.name}</h3>
                  <code className="text-[10px] text-slate-400 font-mono select-all block">{key.keyMask}</code>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getProviderStyle(key.provider)}`}>
                    {key.provider}
                  </span>
                  
                  {/* Status toggle dot */}
                  <button
                    onClick={() => handleToggleStatus(key)}
                    className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors focus:outline-none"
                    title={key.status === KeyStatus.ACTIVE ? 'Disable Key' : 'Enable Key'}
                  >
                    {key.status === KeyStatus.ACTIVE ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Priority & Metrics */}
              <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-3 text-center my-3">
                <div>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Priority</p>
                  <p className="text-xs font-extrabold text-white mt-0.5">{key.priority}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Success Rate</p>
                  <p className="text-xs font-extrabold text-cyan-400 mt-0.5">
                    {key.successCount + key.errorCount > 0
                      ? `${Math.round((key.successCount / (key.successCount + key.errorCount)) * 100)}%`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Daily Caps</p>
                  <p className="text-xs font-extrabold text-white mt-0.5">
                    {key.dailyLimit > 0 ? `${key.dailyLimit} req` : 'Unlimited'}
                  </p>
                </div>
              </div>

              {/* Tags & Groups */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  {key.group && (
                    <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/5 max-w-[120px]">
                      <Folder className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{key.group}</span>
                    </div>
                  )}
                  {key.tags.slice(0, 2).map((tag) => (
                    <div key={tag} className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 border border-white/5 max-w-[80px]">
                      <Tag className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{tag}</span>
                    </div>
                  ))}
                </div>

                {/* Edit & Delete Controls */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => openEditModal(key)}
                    className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all outline-none"
                    aria-label="Edit Key"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="h-8 w-8 flex items-center justify-center text-red-400/80 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all outline-none"
                    aria-label="Delete Key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal Overlay */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-background border border-white/[0.08] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <h3 className="font-bold text-base text-white font-outfit">
                  {editingKey ? 'Update API Key Details' : 'Register New API Key'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 focus:outline-none"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {error && (
                  <div className="p-3 text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg text-center font-semibold">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Friendly Name</label>
                    <input
                      type="text"
                      placeholder="My OpenAI Key"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">AI Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as ProviderCode)}
                      disabled={!!editingKey} // Cannot change provider on existing key
                      className="w-full h-11 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs transition-all"
                    >
                      <option value={ProviderCode.OPENAI} className="bg-slate-900">OpenAI</option>
                      <option value={ProviderCode.GEMINI} className="bg-slate-900">Google Gemini</option>
                      <option value={ProviderCode.CLAUDE} className="bg-slate-900">Anthropic Claude</option>
                      <option value={ProviderCode.GROQ} className="bg-slate-900">Groq</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {editingKey ? 'API Key Secret (Leave blank to keep current)' : 'API Key Secret'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingKey ? '••••••••••••••••••••' : 'sk-proj-...'}
                    value={apiKeyVal}
                    onChange={(e) => setApiKeyVal(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs transition-all"
                  />
                </div>

                {/* Priority Selector */}
                <div className="space-y-2 py-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Rotation Priority</span>
                    </label>
                    <span className="text-xs font-bold text-cyan-400">{priority}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-white/5"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-semibold uppercase">
                    <span>Normal (1)</span>
                    <span>High (5)</span>
                    <span>Critical (10)</span>
                  </div>
                </div>

                {/* Limits section */}
                <div className="border-t border-white/5 pt-4 space-y-1">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5 mb-2">
                    <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Rate-Limiting Caps</span>
                  </span>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Daily Max Req</label>
                      <input
                        type="number"
                        placeholder="0 (Unlimited)"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white focus:outline-none focus:border-primary text-xs transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">RPM Limit</label>
                      <input
                        type="number"
                        placeholder="0 (Unlimited)"
                        value={rpmLimit}
                        onChange={(e) => setRpmLimit(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white focus:outline-none focus:border-primary text-xs transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">TPM Limit</label>
                      <input
                        type="number"
                        placeholder="0 (Unlimited)"
                        value={tpmLimit}
                        onChange={(e) => setTpmLimit(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white focus:outline-none focus:border-primary text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Metadata tags & grouping */}
                <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                      <Folder className="w-3 h-3 text-cyan-400" />
                      <span>Fallback Group</span>
                    </label>
                    <input
                      type="text"
                      placeholder="dev-environment"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary text-xs transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                      <Tag className="w-3 h-3 text-cyan-400" />
                      <span>Tags (Comma separated)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="free, dev"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-primary text-xs transition-all"
                    />
                  </div>
                </div>

                {/* Submit action */}
                <div className="border-t border-white/5 pt-4 flex space-x-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-11 px-5 rounded-lg border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.02] text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-neon text-xs font-bold h-11 px-6 flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Connectivity...</span>
                      </>
                    ) : (
                      <span>{editingKey ? 'Update Key' : 'Register Key'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
