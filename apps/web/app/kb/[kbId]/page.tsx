'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { StatusBadge } from '@/components/status-badge';
import { KBEventFeed } from '@/components/kb-event-feed';
import { useKBStatus } from '@/lib/sse';
import Link from 'next/link';
import { ExternalLink, GitMerge, Github, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { KBStatus, KnowledgeBase } from '@/types/kb';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function KBDetailPage({ params }: { params: { kbId: string } }) {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);

  const fetchKb = () => {
    api.getKB(params.kbId).then((data) => {
      setKb(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchKb();
    const interval = setInterval(fetchKb, 4000);
    return () => clearInterval(interval);
  }, [params.kbId]);

  const { status, events, isConnected } = useKBStatus(params.kbId);

  const handleRestart = async () => {
    setRestarting(true);
    setRestartMessage(null);
    try {
      const updated = await api.restartKB(params.kbId);
      setKb(updated);
      setRestartMessage("Pipeline restarted successfully!");
      setTimeout(() => setRestartMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to restart pipeline:", err);
      setRestartMessage(err?.message || "Failed to restart pipeline");
    } finally {
      setRestarting(false);
    }
  };
  
  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto text-gray-500 font-mono">Loading telemetry...</div>;
  }

  if (!kb) {
    return <div className="p-8 max-w-7xl mx-auto text-red-500 font-mono">Knowledge Base not found.</div>;
  }

  const currentStatus: KBStatus = status || kb.status || 'queued';
  
  const statusSteps: { id: KBStatus, label: string }[] = [
    { id: 'queued', label: 'Queued' },
    { id: 'ingesting', label: 'Ingesting' },
    { id: 'generating', label: 'Generating' },
    { id: 'in_review', label: 'In Review' },
    { id: 'published', label: 'Published' }
  ];
  
  const currentIndex = statusSteps.findIndex(s => s.id === currentStatus);

  // Check for any pipeline error event
  const allEvents = events.length > 0 ? events : (kb as any).events || [];
  const latestErrorEvent = [...allEvents].reverse().find((e: any) => (e.eventType || e.event_type) === 'pipeline_error');

  // Safely parse sourceUrls into an array of {type, url}
  let sourcesList: { type: string; url: string }[] = [];
  try {
    const raw = (kb as any).sourceUrls || (kb as any).source_urls;
    if (Array.isArray(raw)) {
      sourcesList = raw.map((item: any) => typeof item === 'object' && item.url ? item : { type: 'custom', url: String(item) });
    } else if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        sourcesList = parsed;
      } else if (typeof parsed === 'object') {
        sourcesList = Object.entries(parsed).map(([type, url]) => ({ type, url: String(url) }));
      }
    } else if (raw && typeof raw === 'object') {
      sourcesList = Object.entries(raw).map(([type, url]) => ({ type, url: String(url) }));
    }
  } catch (e) {
    console.error("Failed to parse sourceUrls", e);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-sm font-mono text-gray-500 mb-2">
            <Link href="/orgs" className="hover:text-stellar">Orgs</Link> / 
            <Link href={`/orgs/${kb.orgId}`} className="hover:text-stellar"> {kb.orgId}</Link> / 
            <span className="text-gray-300"> {kb.id}</span>
          </div>
          <h1 className="text-3xl font-space font-bold flex items-center gap-4">
            {kb.appName}
            <StatusBadge status={currentStatus} size="lg" />
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mr-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-orbit animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'Live' : 'Disconnected'}
          </div>
          
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="bg-stellar/20 hover:bg-stellar/30 text-stellar border border-stellar/40 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(56,189,248,0.15)]"
          >
            <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
            {restarting ? 'Restarting...' : 'Restart Pipeline'}
          </button>

          {kb.gitRepoUrl && (
            <a href={kb.gitRepoUrl} target="_blank" rel="noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all">
              <Github className="w-4 h-4" /> Repository
            </a>
          )}
          {currentStatus === 'published' && (
            <Link href={`/kb/${kb.id}/explore`} className="bg-orbit/20 hover:bg-orbit/30 border border-orbit/40 text-orbit px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <FileText className="w-4 h-4" /> Explore Knowledge Base
            </Link>
          )}
        </div>
      </div>

      {restartMessage && (
        <div className="p-4 rounded-xl bg-stellar/10 border border-stellar/30 text-stellar font-mono text-sm flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {restartMessage}
        </div>
      )}

      {/* Failure Banner */}
      {(currentStatus === 'failed' || latestErrorEvent) && currentStatus !== 'in_review' && currentStatus !== 'published' && (
        <div className="p-5 rounded-xl border border-red-500/40 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-space font-bold text-red-200">Pipeline Execution Encountered An Error</h3>
              <p className="font-mono text-xs text-red-300/80 mt-1 max-w-2xl">
                {latestErrorEvent?.payload?.error || (latestErrorEvent as any)?.description || "The automated knowledge pipeline failed during execution. You can restart the pipeline to retry ingestion and compilation."}
              </p>
            </div>
          </div>
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all shrink-0 font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
            Retry Pipeline
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Status Timeline */}
          <NebulaCard title="Deployment Trajectory" glow={currentStatus === 'published' ? 'green' : currentStatus === 'failed' ? 'red' : 'purple'}>
            <div className="flex justify-between items-center relative py-4">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10 -z-10" />
              {statusSteps.map((step, idx) => {
                const isActive = idx === currentIndex;
                const isPast = currentIndex !== -1 && idx < currentIndex;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-2 bg-void px-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      currentStatus === 'failed' && isActive ? 'border-red-500 bg-red-500/20 shadow-[0_0_10px_#ef4444]' :
                      isActive ? 'border-nebula bg-nebula/20 shadow-[0_0_10px_#7c3aed] animate-pulse' : 
                      isPast ? 'border-orbit bg-orbit/20 text-orbit' : 
                      'border-white/20 bg-void'
                    }`}>
                      {isPast && <div className="w-2 h-2 bg-orbit rounded-full" />}
                      {isActive && <div className={`w-2 h-2 rounded-full ${currentStatus === 'failed' ? 'bg-red-500' : 'bg-nebula'}`} />}
                    </div>
                    <span className={`text-xs font-mono ${isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {currentStatus === 'in_review' && kb.prUrl && (
              <div className="mt-8 flex gap-4 p-4 border border-pulsar/30 bg-pulsar/10 rounded-lg">
                <GitMerge className="w-6 h-6 text-pulsar" />
                <div>
                  <h4 className="font-space text-white">Review Required</h4>
                  <p className="text-sm font-mono text-gray-400 mt-1 mb-3">Changes have been compiled and a Pull Request is ready for review.</p>
                  <div className="flex gap-3">
                    <a href={kb.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-mono bg-pulsar text-black px-3 py-1.5 rounded hover:bg-pulsar/90 font-bold">
                      Review PR on GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={async () => {
                      const updated = await api.syncKB(params.kbId);
                      setKb(updated);
                    }} className="inline-flex items-center gap-2 text-xs font-mono border border-pulsar/50 text-pulsar px-3 py-1.5 rounded hover:bg-pulsar/10 font-bold">
                      <RefreshCw className="w-3 h-3" /> Sync Merge Status
                    </button>
                  </div>
                </div>
              </div>
            )}
          </NebulaCard>

          {/* Event Feed */}
          <NebulaCard title="Event Telemetry">
            <KBEventFeed events={events.length > 0 ? events : (kb as any).events || []} />
          </NebulaCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <NebulaCard title="Source Systems" glow="none">
            <ul className="space-y-4">
              {sourcesList.map((source, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm font-mono text-gray-300">
                  {source.type === 'github' ? <Github className="w-4 h-4 text-gray-400 shrink-0" /> : <FileText className="w-4 h-4 text-blue-400 shrink-0" />}
                  <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-stellar truncate">{source.url}</a>
                </li>
              ))}
              {sourcesList.length === 0 && (
                <li className="text-gray-500 font-mono text-sm">No sources configured.</li>
              )}
            </ul>
          </NebulaCard>

          <NebulaCard title="Metadata" glow="none">
            <div className="space-y-3 text-sm font-mono">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">ID</span>
                <span className="text-gray-300 truncate ml-4" title={kb.id}>{kb.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">{new Date(kb.createdAt || '').toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-300">{new Date(kb.updatedAt || '').toLocaleString()}</span>
              </div>
            </div>
          </NebulaCard>
        </div>
      </div>
    </div>
  );
}
