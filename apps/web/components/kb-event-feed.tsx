'use client';

import { KBEvent } from '@/types/kb';
import { 
  ArrowRight, ShieldCheck, ShieldX, GitPullRequest, Code2, 
  Search, Folder, Download, Database, Cpu, Sparkles, CheckCircle2, 
  AlertTriangle, RefreshCw, Rocket, Github 
} from 'lucide-react';

interface KBEventFeedProps {
  events: KBEvent[];
}

export function KBEventFeed({ events }: KBEventFeedProps) {
  const getEventIcon = (type: string) => {
    switch(type) {
      case 'status_change': return <ArrowRight className="w-4 h-4 text-stellar" />;
      case 'pipeline_started': return <Rocket className="w-4 h-4 text-stellar" />;
      case 'pipeline_restarted': return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case 'source_scanning': return <Search className="w-4 h-4 text-cyan-400" />;
      case 'source_files_found': return <Folder className="w-4 h-4 text-blue-400" />;
      case 'source_downloaded': return <Download className="w-4 h-4 text-indigo-400" />;
      case 'archive_uploaded': return <Database className="w-4 h-4 text-emerald-400" />;
      case 'llm_analysis_started': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'ingestion_complete': return <CheckCircle2 className="w-4 h-4 text-orbit" />;
      case 'compilation_complete': return <Sparkles className="w-4 h-4 text-nebula-light" />;
      case 'repo_provisioned': return <Github className="w-4 h-4 text-pink-400" />;
      case 'pr_opened': return <GitPullRequest className="w-4 h-4 text-pulsar" />;
      case 'gatekeeper_pass': return <ShieldCheck className="w-4 h-4 text-orbit" />;
      case 'gatekeeper_block': return <ShieldX className="w-4 h-4 text-red-500" />;
      case 'diff_ingested': return <Code2 className="w-4 h-4 text-nebula" />;
      case 'pipeline_error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <ArrowRight className="w-4 h-4 text-gray-400" />;
    }
  };

  if (events.length === 0) {
    return <div className="text-center p-8 text-gray-500 font-mono text-sm border border-white/5 rounded-xl glass-card">No events recorded in the void yet.</div>;
  }

  return (
    <div className="glass-card p-4 rounded-xl max-h-[400px] overflow-y-auto space-y-4">
      {[...events].reverse().map((event: any, idx: number) => {
        const eventType = event.eventType || event.event_type || 'status_change';
        let desc = event.description;
        if (!desc && event.payload) {
          if (event.payload.error) desc = `Error: ${event.payload.error}`;
          else if (event.payload.message) desc = `${event.payload.message}`;
          else if (eventType === 'source_scanning') desc = `Scanning source repository: ${event.payload.source}`;
          else if (eventType === 'source_files_found') desc = `Found ${event.payload.file_count} matching files in ${event.payload.source}`;
          else if (eventType === 'source_downloaded') desc = `Ingested source (${event.payload.chars} chars) from ${event.payload.source}`;
          else if (eventType === 'archive_uploaded') desc = `Archived raw source snapshot to ${event.payload.path}`;
          else if (eventType === 'llm_analysis_started') desc = `Analyzing application structure with ${event.payload.model} (${event.payload.chars_to_analyze} chars)`;
          else if (event.payload.summary) desc = `Summary: ${typeof event.payload.summary === 'string' ? event.payload.summary.slice(0, 150) + '...' : JSON.stringify(event.payload.summary)}`;
          else if (event.payload.status) desc = `Status updated to: ${event.payload.status}`;
          else if (event.payload.repo_url) desc = `Repository provisioned: ${event.payload.repo_url}`;
          else if (event.payload.pr_url) desc = `Pull Request opened: ${event.payload.pr_url}`;
          else if (event.payload.chars) desc = `Ingestion complete: ${event.payload.chars} characters analyzed`;
          else if (event.payload.file_count) desc = `Compilation complete: ${event.payload.file_count} files generated`;
          else desc = `${eventType.replace(/_/g, ' ')}`;
        }
        if (!desc) desc = eventType.replace(/_/g, ' ');
        const ts = event.timestamp || event.createdAt || event.created_at || Date.now();

        return (
          <div key={event.id || idx} className="flex gap-4 items-start group">
            <div className="mt-1 p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              {getEventIcon(eventType)}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-200">{desc}</p>
              <time className="text-xs text-gray-500 font-mono mt-1 block">
                {new Date(ts).toLocaleString()}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
