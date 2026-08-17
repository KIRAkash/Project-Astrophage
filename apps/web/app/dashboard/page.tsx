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
        <NebulaCard glow="amber" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-pulsar">{inReviewKbs}</span>
          <span className="text-sm font-mono text-gray-400 mt-2">In Review</span>
        </NebulaCard>
        <NebulaCard glow="green" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-orbit">{publishedKbs}</span>
          <span className="text-sm font-mono text-gray-400 mt-2">Published</span>
        </NebulaCard>
        <NebulaCard glow="cyan" className="flex flex-col items-center justify-center p-6">
          <span className="text-4xl font-space font-bold text-stellar">{activeAgents}</span>
          <span className="text-sm font-mono text-gray-400 mt-2">Active Agents</span>
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
        </div>
      </div>
    </div>
  );
}
