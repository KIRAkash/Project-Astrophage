'use client';
import { Search } from 'lucide-react';
import { useState } from 'react';

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm font-mono text-gray-400 hover:bg-white/10 hover:text-white transition-all w-64"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search Knowledge Base...</span>
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-gray-700 bg-gray-800 text-[10px] font-sans">
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-2xl bg-[#0B0D14] border border-white/10 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Ask about your architecture... (e.g. 'How does auth work?')" 
                className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-gray-500"
              />
              <span className="text-[10px] font-mono text-stellar bg-stellar/10 px-2 py-1 rounded-full uppercase border border-stellar/20 flex-shrink-0">
                ✨ Semantic Search - Coming Soon
              </span>
            </div>
            <div className="p-6 text-center text-gray-500 font-mono text-sm space-y-2">
              <p>The Semantic Search Engine is currently powering up.</p>
              <p>In version 1.1, you'll be able to chat with your entire codebase and Jira history here.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
