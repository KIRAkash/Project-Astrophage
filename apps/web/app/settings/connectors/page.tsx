'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import Image from 'next/image';

const CONNECTORS = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Codebase, GitOps, and PRs',
    status: 'connected',
    iconUrl: '/assets/sources/github.png',
    glow: 'green'
  },
  {
    id: 'jira',
    name: 'Jira Software',
    description: 'Epics, Stories, and Architecture Tasks',
    status: 'connected',
    iconUrl: '/assets/sources/jira-1.svg',
    glow: 'cyan'
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Product Specs and Requirements',
    status: 'connected',
    iconUrl: '/assets/sources/Confluence.png',
    glow: 'blue'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Wiki Pages and Databases',
    status: 'connected',
    iconUrl: '/assets/sources/Notion_app_logo.png',
    glow: 'purple'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Engineering Discussions and Threads',
    status: 'connected',
    iconUrl: '/assets/sources/Slack_icon_2019.svg.webp',
    glow: 'orange'
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    description: 'Git repository management and CI/CD',
    status: 'coming_soon',
    iconFallback: '🔵',
    glow: 'blue'
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'DevSecOps platform and source control',
    status: 'coming_soon',
    iconFallback: '🦊',
    glow: 'orange'
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Modern issue tracking and project management',
    status: 'coming_soon',
    iconFallback: '📐',
    glow: 'purple'
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Document specs, sheets, and architectures',
    status: 'coming_soon',
    iconFallback: '📁',
    glow: 'green'
  },
  {
    id: 'sharepoint',
    name: 'Microsoft SharePoint',
    description: 'Enterprise document management and intranet',
    status: 'coming_soon',
    iconFallback: 'S',
    glow: 'blue'
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Enterprise chat, channels, and discussions',
    status: 'coming_soon',
    iconFallback: 'T',
    glow: 'purple'
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Design system tokens and UI specifications',
    status: 'coming_soon',
    iconFallback: '🎨',
    glow: 'orange'
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Work management and cross-functional tracking',
    status: 'coming_soon',
    iconFallback: 'A',
    glow: 'red'
  },
  {
    id: 'coda',
    name: 'Coda',
    description: 'All-in-one doc for teams and architecture',
    status: 'coming_soon',
    iconFallback: 'C',
    glow: 'red'
  },
  {
    id: 'miro',
    name: 'Miro',
    description: 'Visual whiteboards and architecture diagrams',
    status: 'coming_soon',
    iconFallback: 'M',
    glow: 'yellow'
  }
];

export default function ConnectorsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-space font-bold">Connector Mesh</h1>
        <p className="text-gray-400 font-mono mt-2">Manage integrations with your organizational tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONNECTORS.map((connector) => (
          <NebulaCard 
            key={connector.id} 
            glow={connector.glow as any} 
            className={`flex flex-col p-6 transition-colors relative overflow-hidden ${connector.status === 'coming_soon' ? 'opacity-80' : 'hover:bg-white/5'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-md bg-white/10 flex items-center justify-center p-1.5 overflow-hidden border border-white/20 ${connector.status === 'coming_soon' ? 'opacity-50 grayscale' : ''}`}>
                {connector.iconUrl ? (
                  <img src={connector.iconUrl} alt={connector.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl">{connector.iconFallback}</span>
                )}
              </div>
              {connector.status === 'connected' ? (
                <span className="flex items-center gap-1 text-xs font-mono text-orbit bg-orbit/10 px-2 py-1 rounded-full border border-orbit/20">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                  Pending API
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-space font-bold">{connector.name}</h3>
            <p className="text-sm font-mono text-gray-400 mt-2 mb-6 flex-1">
              {connector.description}
            </p>

            {connector.status === 'connected' ? (
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500">Incremental Delta Sync: ON</span>
                <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Sync
                </button>
              </div>
            ) : (
              <button 
                disabled
                className="w-full py-2 rounded-md bg-white/5 border border-white/5 text-sm font-mono text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="w-3 h-3" /> Coming Soon
              </button>
            )}
          </NebulaCard>
        ))}
      </div>
    </div>
  );
}
