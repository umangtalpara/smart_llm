'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { ApiKey, KeyStatus } from '../../../../../shared/types';
import { Key, Plus, Loader2 } from 'lucide-react';
import ApiKeyCard from './components/api-key-card';
import ApiKeyModal, { ApiKeyPayload } from './components/api-key-modal';
import DeveloperTokensSection from './components/developer-tokens';
import IntegrationGuide from './components/integration-guide';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api-keys');
      setKeys(response.data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Failed to fetch API Keys.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const openAddModal = () => {
    setEditingKey(null);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (key: ApiKey) => {
    setEditingKey(key);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: ApiKeyPayload) => {
    setError(null);
    setIsSubmitting(true);

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
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Operation failed. Please check key validity.');
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
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Delete failed.');
    }
  };

  const handleToggleStatus = async (key: ApiKey) => {
    const nextStatus = key.status === KeyStatus.ACTIVE ? KeyStatus.INACTIVE : KeyStatus.ACTIVE;
    try {
      await api.patch(`/api-keys/${key.id}`, { status: nextStatus });
      fetchKeys();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Status toggle failed.');
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
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      <DeveloperTokensSection />

      <IntegrationGuide />

      <ApiKeyModal
        isOpen={modalOpen}
        editingKey={editingKey}
        isSubmitting={isSubmitting}
        error={error}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
