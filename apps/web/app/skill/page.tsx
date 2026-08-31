'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { Terminal, Sparkles, Code2, Zap, Download } from 'lucide-react';
import { useState } from 'react';

const AGENTS = [
  { id: 'cursor', name: 'Cursor', command: 'ap init cursor', img: '/assets/agents/cursor-ai.png', desc: 'Appends to your project\'s .cursorrules file' },
  { id: 'claude', name: 'Claude Code', command: 'ap init claude', img: '/assets/agents/claude-ai-icon.webp', desc: 'Creates a CLAUDE.md memory file' },
  { id: 'antigravity', name: 'Antigravity', command: 'ap init antigravity', img: '/assets/agents/antigravity-icon__full-color.png', desc: 'Installs directly into ~/.gemini/config/skills' },
  { id: 'copilot', name: 'GitHub Copilot', command: 'ap init copilot', img: '/assets/agents/github-copilot-icon.webp', desc: 'Configures custom instructions for GitHub Copilot' }
];

export default function SkillPage() {
  const [activeAgent, setActiveAgent] = useState('cursor');

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 mb-20">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stellar/10 border border-stellar/20 text-stellar text-sm font-mono mb-4">
          <Sparkles className="w-4 h-4" />
          Available Now
        </div>
        <h1 className="text-5xl font-space font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Supercharge Your AI Agents
        </h1>
        <p className="text-lg font-mono text-gray-400">
          The Astrophage Skill gives any AI coding agent instant, structured access to your generated OpenKB architecture documentation.
        </p>
      </div>

      {/* Supported Agents */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AGENTS.map(agent => (
          <div key={agent.name} className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border border-white/20 mb-3 shadow-lg bg-white ${agent.id === 'antigravity' ? 'p-2' : 'p-1.5'} overflow-hidden`}>
              <img src={agent.img} alt={agent.name} className="w-full h-full object-contain" />
            </div>
            <span className="font-space font-bold">{agent.name}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Why use it */}
        <NebulaCard title="Why Install The Skill?" glow="purple">
          <ul className="space-y-6 mt-4">
            <li className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Code2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-space font-bold text-white text-lg">Stop Hallucinations</h4>
                <p className="font-mono text-sm text-gray-400 mt-1">Agents no longer have to guess how your APIs or Database schemas work. They fetch the exact, up-to-date documentation.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/30">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-space font-bold text-white text-lg">Save Context Tokens</h4>
                <p className="font-mono text-sm text-gray-400 mt-1">Instead of pasting your entire repository into the chat, agents use `ap search` to fetch only the ~4000 characters of architecture context they actually need.</p>
              </div>
            </li>
          </ul>
        </NebulaCard>

        {/* 2-Step Setup */}
        <NebulaCard title="Seamless Setup" glow="cyan" className="flex flex-col">
          <div className="space-y-8 mt-2 flex-1">
            
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-stellar/20 text-stellar border border-stellar/30 flex items-center justify-center text-xs font-bold">1</div>
                <h4 className="font-space font-bold text-white text-lg">Install the Core CLI</h4>
              </div>
              <p className="text-sm font-mono text-gray-400 mb-3 ml-9">Run this one-liner in your terminal to securely install the `ap` tool globally using a sparse-checkout (extremely fast).</p>
              <div className="relative group ml-9">
                <div className="absolute inset-0 bg-stellar/20 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <pre className="relative bg-black border border-white/20 p-4 rounded-lg overflow-x-auto text-sm font-mono text-green-400 shadow-inner">
                  <code>curl -fsSL https://raw.githubusercontent.com/KIRAkash/Project-Astrophage/main/astrophage-skill/install.sh | bash</code>
                </pre>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-orbit/20 text-orbit border border-orbit/30 flex items-center justify-center text-xs font-bold">2</div>
                <h4 className="font-space font-bold text-white text-lg">Initialize Your Agent</h4>
              </div>
              <p className="text-sm font-mono text-gray-400 mb-4 ml-9">Run the init command for your preferred agent inside your repository. The CLI will automatically configure the correct rules and memory files.</p>
              
              <div className="ml-9 border border-white/10 rounded-xl overflow-hidden bg-[#040711]">
                <div className="flex border-b border-white/10 overflow-x-auto">
                  {AGENTS.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => setActiveAgent(agent.id)}
                      className={`flex-1 py-3 px-4 text-xs font-mono font-bold transition-colors whitespace-nowrap ${
                        activeAgent === agent.id 
                          ? 'bg-white/10 text-white border-b-2 border-orbit' 
                          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                      }`}
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>
                <div className="p-5">
                  {AGENTS.map(agent => (
                    <div key={agent.id} className={activeAgent === agent.id ? 'block' : 'hidden'}>
                      <pre className="bg-black border border-white/10 p-3 rounded-lg text-sm font-mono text-cyan-400 mb-3">
                        <code>{agent.command}</code>
                      </pre>
                      <p className="text-xs font-mono text-gray-500 flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5" /> {agent.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </NebulaCard>
      </div>

    </div>
  );
}
