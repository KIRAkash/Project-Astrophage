'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { StatusBadge } from '@/components/status-badge';
import { KBEventFeed } from '@/components/kb-event-feed';
import { useKBStatus } from '@/lib/sse';
import Link from 'next/link';
import { Plus, ExternalLink, GitMerge, Github, FileText, RefreshCw, AlertTriangle, GitCompare, Code2, Sparkles, MessageSquare, Book, Trello, Upload, CheckCircle2 } from 'lucide-react';

import { KBStatus, KnowledgeBase } from '@/types/kb';
import { AddSourcePanel } from '@/components/add-source-panel';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function KBDetailPage({ params }: { params: { kbId: string } }) {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);

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
      setRestartMessage("Pipeline restarted from scratch (all cached checkpoints cleared)!");
      setTimeout(() => setRestartMessage(null), 5000);
    } catch (err: any) {
      console.error("Failed to restart pipeline:", err);
      setRestartMessage(err?.message || "Failed to restart pipeline");
    } finally {
      setRestarting(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setRestartMessage(null);
    try {
      const updated = await api.retryKB(params.kbId);
      setKb(updated);
      setRestartMessage("Retrying pipeline (resuming from saved checkpoints)...");
      setTimeout(() => setRestartMessage(null), 5000);
    } catch (err: any) {
      console.error("Failed to retry pipeline:", err);
      setRestartMessage(err?.message || "Failed to retry pipeline");
    } finally {
      setRetrying(false);
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setSyncMessage(null);
    try {
      const res = await api.checkKBUpdates(params.kbId);
      if (res.status === 'triggered') {
        const triggers = res.sources_scanned?.filter(s => s.status === 'triggered') || [];
        const triggerSummary = triggers.map(t => `${t.source_type.toUpperCase()}: ${t.summary || 'Changes detected'}`).join(' | ');
        setSyncMessage({
          text: `Gatekeeper evaluation initiated: ${triggerSummary || res.message || 'Changes detected across sources'}`,
          type: 'success',
        });
      } else if (res.status === 'no_changes') {
        setSyncMessage({
          text: res.message || `No new changes detected across configured sources.`,
          type: 'info',
        });
      } else {
        setSyncMessage({
          text: res.message || "Multi-source update check completed.",
          type: 'info',
        });
      }
      setTimeout(() => setSyncMessage(null), 8000);
      fetchKb();
    } catch (err: any) {
      console.error("Failed to check updates:", err);
      setSyncMessage({
        text: err?.message || "Failed to check source systems for updates.",
        type: 'error',
      });
      setTimeout(() => setSyncMessage(null), 8000);
    } finally {
      setCheckingUpdates(false);
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
            onClick={handleCheckUpdates}
            disabled={checkingUpdates || restarting}
            className="bg-nebula/20 hover:bg-nebula/30 text-nebula-light border border-nebula/40 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(124,58,237,0.15)]"
            title="Inspect source repository for latest commits and trigger Gatekeeper update"
          >
            <GitCompare className={`w-4 h-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
            {checkingUpdates ? 'Rescanning...' : 'Rescan'}
          </button>

          <button
            onClick={handleRestart}
            disabled={restarting || retrying || checkingUpdates}
            className="bg-stellar/20 hover:bg-stellar/30 text-stellar border border-stellar/40 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(56,189,248,0.15)] cursor-pointer"
            title="Wipes all saved checkpoints on disk and restarts ingestion & compilation from scratch"
          >
            <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
            {restarting ? 'Restarting...' : 'Restart'}
          </button>

          {kb.gitRepoUrl && (
            <a href={kb.gitRepoUrl} target="_blank" rel="noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all">
              <Github className="w-4 h-4" /> Repository
            </a>
          )}
          {currentStatus === 'published' && (
            <Link href={`/kb/${kb.id}/explore`} className="bg-orbit/20 hover:bg-orbit/30 border border-orbit/40 text-orbit px-6 py-3 rounded-xl font-mono text-base flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] font-bold scale-110">
              <FileText className="w-5 h-5" /> Explore
            </Link>
          )}
        </div>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-xl font-mono text-sm flex items-center gap-3 border ${
          syncMessage.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : syncMessage.type === 'success'
            ? 'bg-orbit/10 border-orbit/30 text-orbit'
            : 'bg-stellar/10 border-stellar/30 text-stellar'
        }`}>
          {syncMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : syncMessage.type === 'success' ? (
            <Sparkles className="w-4 h-4 text-orbit shrink-0 animate-pulse" />
          ) : (
            <Code2 className="w-4 h-4 text-stellar shrink-0" />
          )}
          {syncMessage.text}
        </div>
      )}

      {restartMessage && (
        <div className="p-4 rounded-xl bg-stellar/10 border border-stellar/30 text-stellar font-mono text-sm flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {restartMessage}
        </div>
      )}

      {/* Failure Banner - Only shown when status is failed and not actively running/retrying */}
      {currentStatus === 'failed' && !restarting && !retrying && (
        <div className="p-5 rounded-xl border border-red-500/40 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-space font-bold text-red-200">Pipeline Execution Encountered An Error</h3>
              <p className="font-mono text-xs text-red-300/80 mt-1 max-w-2xl">
                {latestErrorEvent?.payload?.error || (latestErrorEvent as any)?.description || "The automated knowledge pipeline failed during execution. Choose to retry from the latest checkpoint or restart from scratch."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRetry}
              disabled={retrying || restarting}
              className="bg-orbit/20 hover:bg-orbit/30 text-orbit border border-orbit/40 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all font-semibold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              title="Resumes compilation from already generated checkpoints"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Retry (From Checkpoint)'}
            </button>
            <button
              onClick={handleRestart}
              disabled={restarting || retrying}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all font-semibold cursor-pointer"
              title="Clears all saved checkpoints and restarts from scratch"
            >
              <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? 'Restarting...' : 'Restart'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Architecture Map Placeholder */}
          <NebulaCard title="Architecture Dependency Graph" glow="cyan">
            <div className="relative h-64 w-full rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0f] flex items-center justify-center">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #38bdf8 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
              <div className="z-10 text-center space-y-3 p-6 bg-black/40 rounded-xl border border-white/20 backdrop-blur-md max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-stellar/20 flex items-center justify-center mx-auto mb-2 border border-stellar/30">
                  <span className="text-xl">🕸️</span>
                </div>
                <h3 className="font-space font-bold text-white text-lg">Interactive Map Coming Soon</h3>
                <p className="font-mono text-xs text-gray-400">The 3D Dependency Graph is currently rendering. You'll soon be able to visualize cross-repo data flows here.</p>
              </div>
            </div>
          </NebulaCard>

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
            <ul className="space-y-3">
              {sourcesList.map((source: any, idx) => {
                const sType = source.type || 'github';
                let IconComponent = Github;
                let colorClass = "text-gray-400";
                if (sType === 'confluence') { IconComponent = FileText; colorClass = "text-blue-400"; }
                else if (sType === 'notion') { IconComponent = Book; colorClass = "text-amber-400"; }
                else if (sType === 'slack') { IconComponent = MessageSquare; colorClass = "text-emerald-400"; }
                else if (sType === 'jira') { IconComponent = Trello; colorClass = "text-cyan-400"; }
                else if (sType === 'upload') { IconComponent = Upload; colorClass = "text-purple-400"; }

                const isAutoSync = source.incrementalEnabled !== false && sType !== 'upload';

                return (
                  <li key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-200">
                        <IconComponent className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />
                        <span className="font-bold uppercase">{sType}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isAutoSync 
                          ? 'bg-orbit/10 border-orbit/30 text-orbit' 
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}>
                        {isAutoSync ? '● Auto-Sync' : 'Manual'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-400 truncate">
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-stellar truncate">
                          {source.url}
                        </a>
                      ) : (
                        <span className="italic text-gray-600">Local uploaded archive</span>
                      )}
                    </div>
                  </li>
                );
              })}
              {sourcesList.length === 0 && (
                <li className="text-gray-500 font-mono text-sm">No sources configured.</li>
              )}
            </ul>
            <button
              onClick={() => setShowAddSource(true)}
              className="mt-4 w-full bg-white/5 hover:bg-white/10 text-gray-300 border border-dashed border-white/20 py-2.5 rounded-lg font-mono text-sm flex items-center justify-center gap-2 transition-all"
              title="Add a new source to this Knowledge Base incrementally"
            >
              <Plus className="w-4 h-4" /> Add Source
            </button>
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
