'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../services/api';
import { DeveloperToken } from '../../../../../../shared/types';
import { ShieldAlert, Plus, Key, Loader2, Copy, Check } from 'lucide-react';
import DeveloperTokensTable from './developer-tokens-table';

export default function DeveloperTokensSection() {
  const [tokens, setTokens] = useState<DeveloperToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [generatedRawToken, setGeneratedRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/developer-tokens');
      setTokens(response.data);
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to fetch developer tokens.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.post('/developer-tokens', { name: tokenName });
      setGeneratedRawToken(response.data.rawToken);
      setTokenName('');
      setShowInput(false);
      fetchTokens();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Failed to generate token.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this developer token? Apps using it will immediately lose API access.')) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/developer-tokens/${id}`);
      fetchTokens();
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to revoke developer token.');
    }
  };

  const copyToClipboard = () => {
    if (generatedRawToken) {
      navigator.clipboard.writeText(generatedRawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyTokenMask = (mask: string, id: string) => {
    navigator.clipboard.writeText(mask);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-base font-bold text-white font-outfit">Gateway Access Tokens</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Custom developer keys used to authenticate your third-party applications with this LLM proxy.
          </p>
        </div>
        {!showInput && !generatedRawToken && (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-bold transition-all min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Token</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 text-xs font-medium text-rose-300 bg-rose-950/30 border border-rose-500/20 rounded-lg">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* One-time Display Modal */}
      {generatedRawToken && (
        <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-5 space-y-3.5 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Key className="w-4 h-4" />
            <h4 className="text-xs font-bold font-outfit">Token Generated Successfully!</h4>
          </div>
          <p className="text-[10px] text-cyan-200/70 leading-relaxed">
            Copy this token now. For security, it will **never be shown again**. If you lose it, you will need to revoke it and generate a new one.
          </p>
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-white/5 rounded-lg p-2.5">
            <code className="text-[11px] font-mono text-cyan-300 break-all select-all flex-1 pr-2">{generatedRawToken}</code>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-md hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shrink-0"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setGeneratedRawToken(null)}
            className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-bold rounded-lg transition-all"
          >
            I Have Saved This Token
          </button>
        </div>
      )}

      {/* Generate Input Form */}
      {showInput && (
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-stretch gap-3 bg-white/[0.01] border border-white/5 rounded-xl p-4">
          <input
            type="text"
            placeholder="Token description (e.g. Production Mobile App)"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            disabled={isGenerating}
            maxLength={100}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 min-h-[40px]"
            required
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isGenerating || !tokenName.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:text-cyan-400 text-slate-950 font-bold text-xs transition-all min-h-[40px]"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Generate</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setTokenName(''); }}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-all min-h-[40px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tokens List */}
      <DeveloperTokensTable
        tokens={tokens}
        isLoading={isLoading}
        copiedTokenId={copiedTokenId}
        onCopyTokenMask={copyTokenMask}
        onRevoke={handleRevoke}
      />
    </div>
  );
}
