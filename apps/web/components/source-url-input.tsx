'use client';
import { useState } from 'react';
import { SourceType, SourceItem } from '@/types/kb';
import { Plus, Trash2, Github, FileText, Book, Trello, Upload, MessageSquare, Settings2, ChevronDown, ChevronUp, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceUrlInputProps {
  sources: SourceItem[];
  onChange: (sources: SourceItem[]) => void;
}

const typeConfig: Record<SourceType, { 
  icon: any; 
  label: string; 
  placeholder: string; 
  hint: string;
  supportsIncremental: boolean;
}> = {
  github: { 
    icon: Github, 
    label: 'GitHub', 
    placeholder: 'https://github.com/org/repo',
    hint: 'Git repository — tracks commits, PRs, and branch diffs',
    supportsIncremental: true,
  },
  confluence: { 
    icon: FileText, 
    label: 'Confluence', 
    placeholder: 'https://domain.atlassian.net/wiki/spaces/SPACEKEY',
    hint: 'Confluence space — tracks page edits, new articles & specs',
    supportsIncremental: true,
  },
  notion: { 
    icon: Book, 
    label: 'Notion', 
    placeholder: 'https://notion.so/workspace/PageTitle-4a2a118d27774d0089852899477e900c',
    hint: 'Notion page or database — tracks block updates & sub-pages',
    supportsIncremental: true,
  },
  slack: { 
    icon: MessageSquare, 
    label: 'Slack', 
    placeholder: 'https://workspace.slack.com/archives/C0123456789 or #channel-name',
    hint: 'Slack channel — extracts architectural decisions & discussion threads',
    supportsIncremental: true,
  },
  jira: { 
    icon: Trello, 
    label: 'Jira', 
    placeholder: 'https://domain.atlassian.net/jira/projects/PROJ',
    hint: 'Jira project — ingests Epics, Stories, and architecture tasks',
    supportsIncremental: true,
  },
  upload: { 
    icon: Upload, 
    label: 'File Upload', 
    placeholder: 'Upload local architecture specs or markdown files...',
    hint: 'Static documentation, PDF, OpenAPI schemas, or Markdown files',
    supportsIncremental: false,
  }
};

export function SourceUrlInput({ sources, onChange }: SourceUrlInputProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addSource = () => {
    onChange([...sources, { 
      type: 'github', 
      url: '', 
      incrementalEnabled: true,
      config: {} 
    }]);
  };

  const removeSource = (index: number) => {
    const newSources = [...sources];
    newSources.splice(index, 1);
    onChange(newSources);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateSource = (index: number, field: keyof SourceItem, value: any) => {
    const newSources = [...sources];
    newSources[index] = { ...newSources[index], [field]: value };
    onChange(newSources);
  };

  const updateSourceConfig = (index: number, configKey: string, configValue: any) => {
    const newSources = [...sources];
    const currentConfig = newSources[index].config || {};
    newSources[index] = {
      ...newSources[index],
      config: { ...currentConfig, [configKey]: configValue }
    };
    onChange(newSources);
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {sources.map((source, idx) => {
        const config = typeConfig[source.type] || typeConfig.github;
        const CurrentIcon = config.icon;
        const isIncremental = source.incrementalEnabled !== false && config.supportsIncremental;
        const isExpanded = expandedIndex === idx;
        
        return (
          <div 
            key={idx} 
            className="bg-white/5 border border-white/10 rounded-xl p-3 transition-all focus-within:border-stellar focus-within:shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:border-white/20"
          >
            <div className="flex gap-2 items-center">
              {/* Type Select with Icon */}
              <div className="relative shrink-0">
                <select 
                  value={source.type}
                  onChange={(e) => {
                    const newType = e.target.value as SourceType;
                    const newSources = [...sources];
                    newSources[idx] = { 
                      ...newSources[idx], 
                      type: newType, 
                      incrementalEnabled: typeConfig[newType].supportsIncremental 
                    };
                    onChange(newSources);
                  }}
                  className="appearance-none bg-void/80 border border-white/10 rounded-lg text-sm font-mono text-gray-200 pl-8 pr-6 py-2 focus:outline-none focus:border-stellar cursor-pointer"
                >
                  {Object.entries(typeConfig).map(([key, item]) => (
                    <option key={key} value={key} className="bg-void text-gray-200">
                      {item.label}
                    </option>
                  ))}
                </select>
                <CurrentIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stellar pointer-events-none" />
              </div>
              
              <div className="w-px h-6 bg-white/10 mx-1" />
              
              {/* URL or File Input */}
              {source.type === 'upload' ? (
                <input 
                  type="file" 
                  className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-stellar/20 file:text-stellar hover:file:bg-stellar/30 cursor-pointer"
                />
              ) : (
                <input 
                  type="text"
                  value={source.url}
                  onChange={(e) => updateSource(idx, 'url', e.target.value)}
                  placeholder={config.placeholder}
                  className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none placeholder:text-gray-600 px-2"
                />
              )}

              {/* Incremental Ingestion Toggle Pill */}
              {config.supportsIncremental && (
                <button
                  type="button"
                  onClick={() => updateSource(idx, 'incrementalEnabled', !isIncremental)}
                  className={cn(
                    "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all shrink-0 cursor-pointer",
                    isIncremental 
                      ? "bg-orbit/15 border-orbit/40 text-orbit shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                      : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-400"
                  )}
                  title={isIncremental ? "Continuous incremental tracking active" : "Incremental auto-sync disabled"}
                >
                  <RefreshCw className={cn("w-3 h-3", isIncremental && "animate-spin-slow")} />
                  <span>{isIncremental ? 'Auto-Sync' : 'Manual Only'}</span>
                </button>
              )}

              {/* Advanced Config Toggle Button */}
              <button
                type="button"
                onClick={() => toggleExpand(idx)}
                className={cn(
                  "p-2 rounded-lg text-gray-400 hover:text-stellar hover:bg-white/5 transition-colors shrink-0",
                  isExpanded && "text-stellar bg-white/5"
                )}
                title="Configure advanced source parameters"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              
              {/* Delete Button */}
              <button 
                type="button" 
                onClick={() => removeSource(idx)}
                disabled={sources.length === 1}
                className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Remove source"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Hint bar */}
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 px-2 mt-1.5">
              <span>{config.hint}</span>
              {config.supportsIncremental && (
                <span className="sm:hidden text-orbit">{isIncremental ? '● Auto-Sync ON' : '○ Auto-Sync OFF'}</span>
              )}
            </div>

            {/* Expandable Advanced Configuration Drawer */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 px-2">
                <div className="flex items-center justify-between col-span-full pb-1">
                  <span className="text-xs font-mono text-stellar font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> {config.label} Source Customization
                  </span>
                  {config.supportsIncremental && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-gray-300">
                      <span>Incremental Ingestion:</span>
                      <input 
                        type="checkbox"
                        checked={isIncremental}
                        onChange={(e) => updateSource(idx, 'incrementalEnabled', e.target.checked)}
                        className="accent-stellar cursor-pointer"
                      />
                    </label>
                  )}
                </div>

                {source.type === 'confluence' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Space Key (Optional Override)</label>
                      <input 
                        type="text"
                        value={source.config?.space_key || ''}
                        onChange={(e) => updateSourceConfig(idx, 'space_key', e.target.value)}
                        placeholder="e.g. ENG, ARCH, PROD"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Domain URL</label>
                      <input 
                        type="text"
                        value={source.config?.domain || ''}
                        onChange={(e) => updateSourceConfig(idx, 'domain', e.target.value)}
                        placeholder="https://company.atlassian.net"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                  </>
                )}

                {source.type === 'slack' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Channel ID / Name</label>
                      <input 
                        type="text"
                        value={source.config?.channel_id || ''}
                        onChange={(e) => updateSourceConfig(idx, 'channel_id', e.target.value)}
                        placeholder="e.g. C0123456789 or #architecture"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-gray-300">
                        <input 
                          type="checkbox"
                          checked={source.config?.include_threads !== false}
                          onChange={(e) => updateSourceConfig(idx, 'include_threads', e.target.checked)}
                          className="accent-stellar cursor-pointer"
                        />
                        <span>Include Thread Replies</span>
                      </label>
                    </div>
                  </>
                )}

                {source.type === 'notion' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Page or Database ID</label>
                      <input 
                        type="text"
                        value={source.config?.page_id || ''}
                        onChange={(e) => updateSourceConfig(idx, 'page_id', e.target.value)}
                        placeholder="32-character hexadecimal page/database ID"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Max Nested Depth</label>
                      <input 
                        type="number"
                        defaultValue={10}
                        onChange={(e) => updateSourceConfig(idx, 'max_depth', parseInt(e.target.value))}
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                  </>
                )}

                {source.type === 'jira' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Project Key</label>
                      <input 
                        type="text"
                        value={source.config?.project_key || ''}
                        onChange={(e) => updateSourceConfig(idx, 'project_key', e.target.value)}
                        placeholder="e.g. CORE, API, BACKEND"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Issue Types</label>
                      <input 
                        type="text"
                        value={source.config?.issue_types || 'Epic, Story, Task'}
                        onChange={(e) => updateSourceConfig(idx, 'issue_types', e.target.value)}
                        placeholder="Epic, Story, Task, Bug"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                  </>
                )}

                {source.type === 'github' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Target Branch (Default: main)</label>
                      <input 
                        type="text"
                        value={source.config?.branch || ''}
                        onChange={(e) => updateSourceConfig(idx, 'branch', e.target.value)}
                        placeholder="main, master, release/v2"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">Sub-path Directory Filter</label>
                      <input 
                        type="text"
                        value={source.config?.subpath || ''}
                        onChange={(e) => updateSourceConfig(idx, 'subpath', e.target.value)}
                        placeholder="e.g. packages/backend, src/"
                        className="w-full bg-void border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-stellar"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      <button 
        type="button"
        onClick={addSource}
        className="text-xs font-mono text-stellar hover:text-stellar-light flex items-center gap-1.5 mt-2 bg-white/5 border border-stellar/30 hover:border-stellar/60 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]"
      >
        <Plus className="w-3.5 h-3.5" /> Add Another Source Connector
      </button>
    </div>
  );
}

