'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check, Code, Shield } from 'lucide-react';

type Language = 'curl' | 'python' | 'javascript';

export default function IntegrationGuide() {
  const [activeTab, setActiveTab] = useState<Language>('curl');
  const [copied, setCopied] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const displayToken = '<YOUR_DEVELOPER_TOKEN>';

  const codeSnippets: Record<Language, string> = {
    curl: `curl -X POST ${API_BASE_URL}/proxy/chat/completions \\
  -H "Authorization: Bearer ${displayToken}" \\
  -H "Content-Type: application/json" \\
  -H "x-rotation-strategy: priority" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "2+2=?"}
    ]
  }'`,

    python: `import requests

url = "${API_BASE_URL}/proxy/chat/completions"
headers = {
    "Authorization": "Bearer ${displayToken}",
    "Content-Type": "application/json",
    "x-rotation-strategy": "priority"
}
data = {
    "model": "gpt-4o",
    "messages": [
        {"role": "user", "content": "2+2=?"}
    ]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`,

    javascript: `const response = await fetch("${API_BASE_URL}/proxy/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${displayToken}",
    "Content-Type": "application/json",
    "x-rotation-strategy": "priority"
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "2+2=?" }
    ]
  })
});

const data = await response.json();
console.log(data);`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-primary">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-outfit">API Access & Integration Guide</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Use our proxy gateway as a drop-in replacement for OpenAI using Developer Access Tokens</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex gap-2">
          {(['curl', 'python', 'javascript'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setActiveTab(lang);
                setCopied(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] uppercase ${activeTab === lang
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                }`}
            >
              {lang === 'curl' ? 'cURL' : lang}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-white/20 transition-all min-h-[32px]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>

      {/* Code Snippet Box */}
      <div className="bg-slate-950/80 rounded-xl p-4 border border-white/5 overflow-x-auto relative">
        <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
          {codeSnippets[activeTab]}
        </pre>
      </div>

      {/* Custom Headers Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="flex items-start space-x-3 bg-white/[0.01] border border-white/5 rounded-xl p-4">
          <Code className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">x-rotation-strategy</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Define proxy selection order. Supports: <code className="text-[10px] text-cyan-400">priority</code> (default),{' '}
              <code className="text-[10px] text-cyan-400">round_robin</code>, <code className="text-[10px] text-cyan-400">weighted</code>,{' '}
              or <code className="text-[10px] text-cyan-400">health</code>.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 bg-white/[0.01] border border-white/5 rounded-xl p-4">
          <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">x-fallback-group</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Restrict routing to a specific key cohort. Set to your key&apos;s fallback group (e.g.{' '}
              <code className="text-[10px] text-cyan-400">production</code>) to partition traffic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

