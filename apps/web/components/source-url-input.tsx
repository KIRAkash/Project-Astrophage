'use client';
import { useState } from 'react';
import { SourceType } from '@/types/kb';
import { Plus, Trash2, Github, FileText, Book, Trello, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  type: SourceType;
  url: string;
}

interface SourceUrlInputProps {
  sources: Source[];
  onChange: (sources: Source[]) => void;
}

const typeConfig: Record<SourceType, { icon: any, label: string, placeholder: string }> = {
  github: { icon: Github, label: 'GitHub', placeholder: 'https://github.com/org/repo' },
  confluence: { icon: FileText, label: 'Confluence', placeholder: 'https://domain.atlassian.net/wiki/...' },
  notion: { icon: Book, label: 'Notion', placeholder: 'https://notion.so/...' },
  jira: { icon: Trello, label: 'Jira', placeholder: 'https://domain.atlassian.net/browse/...' },
  upload: { icon: Upload, label: 'File Upload', placeholder: 'Upload a local file...' }
};

export function SourceUrlInput({ sources, onChange }: SourceUrlInputProps) {
  const addSource = () => {
    onChange([...sources, { type: 'github', url: '' }]);
  };

  const removeSource = (index: number) => {
    const newSources = [...sources];
    newSources.splice(index, 1);
    onChange(newSources);
  };

  const updateSource = (index: number, field: keyof Source, value: string) => {
    const newSources = [...sources];
    newSources[index] = { ...newSources[index], [field]: value };
    onChange(newSources);
  };

  return (
    <div className="space-y-4">
      {sources.map((source, idx) => {
        const CurrentIcon = typeConfig[source.type].icon;
        
        return (
          <div key={idx} className="flex gap-2 items-center bg-white/5 border border-white/10 rounded-lg p-2 transition-all focus-within:border-stellar focus-within:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <div className="relative">
              <select 
                value={source.type}
                onChange={(e) => updateSource(idx, 'type', e.target.value as SourceType)}
                className="appearance-none bg-transparent border-none text-sm font-mono text-gray-300 pl-8 pr-6 py-2 focus:outline-none cursor-pointer"
              >
                {Object.entries(typeConfig).map(([key, config]) => (
                  <option key={key} value={key} className="bg-void">{config.label}</option>
                ))}
              </select>
              <CurrentIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="w-px h-6 bg-white/10 mx-2" />
            
            {source.type === 'upload' ? (
              <input 
                type="file" 
                className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-stellar/20 file:text-stellar hover:file:bg-stellar/30"
              />
            ) : (
              <input 
                type="url"
                value={source.url}
                onChange={(e) => updateSource(idx, 'url', e.target.value)}
                placeholder={typeConfig[source.type].placeholder}
                className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none placeholder:text-gray-600"
              />
            )}
            
            <button 
              type="button" 
              onClick={() => removeSource(idx)}
              disabled={sources.length === 1}
              className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      
      <button 
        type="button"
        onClick={addSource}
        className="text-xs font-mono text-stellar hover:text-stellar-light flex items-center gap-1 mt-2"
      >
        <Plus className="w-3 h-3" /> Add another source
      </button>
    </div>
  );
}
