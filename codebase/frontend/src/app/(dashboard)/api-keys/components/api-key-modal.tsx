'use client';

import React, { useState, useEffect } from 'react';
import { ApiKey, ProviderCode } from '../../../../../../shared/types';
import { X, Sliders, Settings2, Folder, Tag, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ApiKeyPayload {
  name: string;
  provider: ProviderCode;
  apiKey?: string;
  dailyLimit: number;
  rpmLimit: number;
  tpmLimit: number;
  priority: number;
  tags: string[];
  group?: string;
}

interface ApiKeyModalProps {
  isOpen: boolean;
  editingKey: ApiKey | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: ApiKeyPayload) => void;
}

export default function ApiKeyModal({
  isOpen,
  editingKey,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ApiKeyModalProps) {
  // Form Fields
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ProviderCode>(ProviderCode.OPENAI);
  const [apiKeyVal, setApiKeyVal] = useState('');
  const [dailyLimit, setDailyLimit] = useState(0);
  const [rpmLimit, setRpmLimit] = useState(0);
  const [tpmLimit, setTpmLimit] = useState(0);
  const [priority, setPriority] = useState(1);
  const [tags, setTags] = useState('');
  const [group, setGroup] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingKey) {
        setName(editingKey.name);
        setProvider(editingKey.provider);
        setApiKeyVal(''); // Don't populate unencrypted key
        setDailyLimit(editingKey.dailyLimit);
        setRpmLimit(editingKey.rpmLimit);
        setTpmLimit(editingKey.tpmLimit);
        setPriority(editingKey.priority);
        setTags(editingKey.tags.join(', '));
        setGroup(editingKey.group || '');
      } else {
        setName('');
        setProvider(ProviderCode.OPENAI);
        setApiKeyVal('');
        setDailyLimit(0);
        setRpmLimit(0);
        setTpmLimit(0);
        setPriority(1);
        setTags('');
        setGroup('');
      }
    }
  }, [isOpen, editingKey]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: ApiKeyPayload = {
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

    onSubmit(payload);
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                type="button"
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 focus:outline-none"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                    required
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
                  required={!editingKey}
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
                  onClick={onClose}
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
  );
}
