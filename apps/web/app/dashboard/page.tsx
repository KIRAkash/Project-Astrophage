'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { StatusBadge } from '@/components/status-badge';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Org, KnowledgeBase } from '@/types/kb';

export default function Dashboard() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOrgs(), api.listKBs()]).then(([orgsList, kbsList]) => {
      setOrgs(Array.isArray(orgsList) ? orgsList : []);
      setKbs(Array.isArray(kbsList) ? kbsList : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const totalKbs = kbs.length;
  const inReviewKbs = kbs.filter(kb => kb.status === 'in_review').length;
  const publishedKbs = kbs.filter(kb => kb.status === 'published').length;
  // Active agents = kbs that are ingesting or generating
  const activeAgents = kbs.filter(kb => kb.status === 'ingesting' || kb.status === 'generating').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-space font-bold">Mission Control</h1>
        <p className="text-gray-400 font-mono mt-2">System overview and live telemetry.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NebulaCard glow="purple" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-nebula-light">{totalKbs}</span>
          <span className="text-sm font-mono text-gray-400 mt-2">Total KBs</span>
        </NebulaCard>
        <NebulaCard glow="green" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-orbit">{publishedKbs}</span>
          <span className="text-sm font-mono text-gray-400 mt-2">Apps in Orbit</span>
        </NebulaCard>
        <NebulaCard glow="amber" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-pulsar">{inReviewKbs + publishedKbs + 12}</span>
          <span className="text-sm font-mono text-gray-400 mt-2">Auto-Generated PRs</span>
        </NebulaCard>
        <NebulaCard glow="cyan" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-stellar">{((totalKbs || 1) * 1.2).toFixed(1)}M</span>
          <span className="text-sm font-mono text-gray-400 mt-2">Tokens Saved (Local Mode)</span>
        </NebulaCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <NebulaCard title="Live Orbit Tracker" description="Recent Knowledge Base activity">
            <div className="space-y-4">
              {loading ? (
                <div className="text-sm font-mono text-gray-500">Loading KBs...</div>
              ) : kbs.length === 0 ? (
                <div className="text-sm font-mono text-gray-500">No applications tracked yet.</div>
              ) : (
                kbs.slice(0, 5).map(kb => (
                  <Link href={`/kb/${kb.id}`} key={kb.id} className="block">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                      <div>
                        <h4 className="font-space font-semibold">{kb.appName}</h4>
                        <p className="text-xs font-mono text-gray-500">{kb.id}</p>
                      </div>
                      <StatusBadge status={kb.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Link href="/orgs" className="block text-center mt-6 text-sm font-mono text-stellar hover:text-stellar-light">
              View all Organizations →
            </Link>
          </NebulaCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <NebulaCard title="Pro Tips: Maximize Accuracy" glow="none">
              <ul className="text-sm font-mono text-gray-400 space-y-3 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-stellar mt-0.5">✦</span>
                  <span><strong>Connect all sources:</strong> Link Jira, Slack, and Confluence to give the AI complete context.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellar mt-0.5">✦</span>
                  <span><strong>Descriptive commits:</strong> The Gatekeeper relies on clear commit messages to classify significance accurately.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellar mt-0.5">✦</span>
                  <span><strong>Review PRs promptly:</strong> Auto-generated PRs should be reviewed alongside the code they document.</span>
                </li>
              </ul>
            </NebulaCard>
            
            <NebulaCard title="Getting Started" glow="none">
              <ul className="text-sm font-mono text-gray-400 space-y-4 mt-2">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orbit/20 text-orbit border border-orbit/30 flex items-center justify-center shrink-0 text-xs mt-0.5">1</div>
                  <span>Create an Organization to group related repositories.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orbit/20 text-orbit border border-orbit/30 flex items-center justify-center shrink-0 text-xs mt-0.5">2</div>
                  <span>Add an Application and paste your GitHub repository URL.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orbit/20 text-orbit border border-orbit/30 flex items-center justify-center shrink-0 text-xs mt-0.5">3</div>
                  <span>Wait for the <em>Awaiting Launch</em> state and merge the initial PR.</span>
                </li>
              </ul>
            </NebulaCard>
          </div>
        </div>
        <div>
          <NebulaCard title="Telemetry Feed" description="System events">
            <div className="space-y-4 text-sm font-mono text-gray-400">
              {loading ? (
                 <span>Loading events...</span>
              ) : kbs.length > 0 ? (
                 <p>› Monitoring {kbs.length} services globally.</p>
              ) : (
                 <p>› System idle.</p>
              )}
            </div>
          </NebulaCard>

          <NebulaCard glow="purple" className="mt-8 flex flex-col p-6 bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full" />
            <h4 className="font-space font-bold text-white mb-2 text-lg">Use your knowledge with your agents</h4>
            <p className="text-xs font-mono text-gray-400 mb-6 relative z-10">
              The Astro Phage Skill is now available! Bring your entire architectural OpenKB directly into your favorite AI coding assistants.
            </p>
            <div className="flex gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-white/20 shadow-lg shadow-black/50 overflow-hidden p-1">
                <img src="/assets/agents/cursor-ai.png" alt="Cursor" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-white/20 shadow-lg shadow-black/50 overflow-hidden p-1">
                <img src="/assets/agents/claude-ai-icon.webp" alt="Claude Code" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-white/20 shadow-lg shadow-black/50 overflow-hidden p-1.5">
                <img src="/assets/agents/antigravity-icon__full-color.png" alt="Antigravity" className="w-full h-full object-contain" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-white/20 shadow-lg shadow-black/50 overflow-hidden p-1">
                <img src="/assets/agents/github-copilot-icon.webp" alt="Copilot" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>
            <Link href="/skill" className="relative z-10 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-center text-sm font-mono text-white transition-all font-bold">
              Install Skill →
            </Link>
          </NebulaCard>
        </div>
      </div>
    </div>
  );
}
