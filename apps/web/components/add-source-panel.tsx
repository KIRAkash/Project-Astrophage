'use client';

import { useState } from 'react';
import { X, Plus, Github, FileText, Book, Trello, MessageSquare, Upload } from 'lucide-react';
import { SourceType, SourceItem, KnowledgeBase } from '@/types/kb';
import { api } from '@/lib/api';

const typeConfig: Record<SourceType, { icon: any; label: string; placeholder: string; supportsIncremental: boolean }> = {
  github: { icon: Github, label: 'GitHub', placeholder: 'https://github.com/org/repo', supportsIncremental: true },
  confluence: { icon: FileText, label: 'Confluence', placeholder: 'https://domain.atlassian.net/wiki/spaces/SPACEKEY', supportsIncremental: true },
  notion: { icon: Book, label: 'Notion', placeholder: 'https://notion.so/workspace/PageTitle', supportsIncremental: true },
  slack: { icon: MessageSquare, label: 'Slack', placeholder: '#channel-name', supportsIncremental: true },
  jira: { icon: Trello, label: 'Jira', placeholder: 'https://domain.atlassian.net/jira/projects/PROJ', supportsIncremental: true },
  upload: { icon: Upload, label: 'File Upload', placeholder: 'Local file upload...', supportsIncremental: false }
};

interface AddSourcePanelProps {
  kbId: string;
  kb: KnowledgeBase;
  onClose: () => void;
  onSuccess: (updatedKb: KnowledgeBase) => void;
}

export function AddSourcePanel({ kbId, kb, onClose, onSuccess }: AddSourcePanelProps) {
  const [type, setType] = useState<SourceType>('github');
  const [url, setUrl] = useState('');
  const [incremental, setIncremental] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    // Duplicate check
    const existingUrls = [
      ...(kb.sourceUrls || []).map(s => s.url),
      ...(kb.sourceMonitors || []).map(m => m.repoUrl || m.sourceUrl)
    ];

    if (existingUrls.includes(url.trim())) {
      setError(`Source ${url.trim()} is already registered for this KB.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.addKBSource(kbId, {
        type,
        url: url.trim(),
        incrementalEnabled: typeConfig[type].supportsIncremental ? incremental : false,
        config: {}
      });

      if (res.status === 'duplicate') {
        setError(res.message);
        setLoading(false);
      } else {
        onSuccess(res.kb);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add source");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-void border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-stellar" /> Add New Source
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Source Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(typeConfig) as SourceType[]).map(t => {
                const conf = typeConfig[t];
                const Icon = conf.icon;
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-stellar/10 border-stellar/40 text-stellar' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-mono">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Source URL / Identifier</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={typeConfig[type].placeholder}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-stellar/50 focus:ring-1 focus:ring-stellar/50 transition-all"
            />
          </div>

          {typeConfig[type].supportsIncremental && (
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="incremental-toggle"
                checked={incremental}
                onChange={e => setIncremental(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-stellar focus:ring-stellar/50 bg-black/40"
              />
              <label htmlFor="incremental-toggle" className="text-sm font-mono text-gray-300 cursor-pointer">
                Enable incremental auto-sync (Gatekeeper)
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-mono text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-stellar text-black px-6 py-2 rounded-lg text-sm font-mono font-bold hover:bg-stellar-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            >
              {loading ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
