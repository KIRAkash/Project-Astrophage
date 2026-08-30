'use client';

import { KBEvent } from '@/types/kb';
import { 
  ArrowRight, ShieldCheck, ShieldX, GitPullRequest, Code2, 
  Search, Folder, Download, Database, Cpu, Sparkles, CheckCircle2, 
  AlertTriangle, RefreshCw, Rocket, Github, Layers, FileCode
} from 'lucide-react';

interface KBEventFeedProps {
  events: KBEvent[];
}

function cleanSourceLabel(sourceUrl?: string): string {
  if (!sourceUrl) return 'Source Repository';
  try {
    const url = new URL(sourceUrl);
    const parts = url.pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    if (parts.length === 1 && parts[0]) return parts[0];
  } catch (_) {
    const parts = sourceUrl.replace(/\/+$/, '').split('/');
    if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return sourceUrl;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\/Users\/[^\s'"]+/g, '')
    .replace(/logdir\/archives\/[^\s'"]+/g, '')
    .replace(/gs:\/\/[^\s'"]+/g, '')
    .replace(/\(\d+\s*chars\)/gi, '')
    .replace(/\b\d+\s*chars\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
      case 'inline_pass_started': return <Sparkles className="w-4 h-4 text-nebula-light" />;
      case 'map_reduce_started': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'map_reduce_progress': return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'ingestion_complete': return <CheckCircle2 className="w-4 h-4 text-orbit" />;
      case 'compilation_started': return <Sparkles className="w-4 h-4 text-nebula animate-pulse" />;
      case 'page_compiled': return <FileCode className="w-4 h-4 text-stellar" />;
      case 'compilation_complete': return <Sparkles className="w-4 h-4 text-nebula-light" />;
      case 'contracts_registered': return <CheckCircle2 className="w-4 h-4 text-orbit" />;
      case 'repo_provisioned': return <Github className="w-4 h-4 text-pink-400" />;
      case 'pr_opened': return <GitPullRequest className="w-4 h-4 text-pulsar" />;
      case 'gatekeeper_pass': return <ShieldCheck className="w-4 h-4 text-orbit" />;
      case 'gatekeeper_significant': return <ShieldCheck className="w-4 h-4 text-orbit" />;
      case 'gatekeeper_trivial': return <ShieldX className="w-4 h-4 text-amber-400" />;
      case 'gatekeeper_block': return <ShieldX className="w-4 h-4 text-amber-400" />;
      case 'gatekeeper_evaluation_started': return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'diff_checked': return <Code2 className="w-4 h-4 text-stellar" />;
      case 'diff_ingested': return <Code2 className="w-4 h-4 text-nebula" />;
      case 'patch_compilation_started': return <Sparkles className="w-4 h-4 text-nebula animate-pulse" />;
      case 'patch_compiled': return <CheckCircle2 className="w-4 h-4 text-orbit" />;
      case 'pipeline_error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <ArrowRight className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventDescription = (event: any): string => {
    const eventType = event.eventType || event.event_type || 'status_change';
    const p = event.payload || {};

    if (p.message) {
      return sanitizeText(p.message);
    }

    switch (eventType) {
      case 'pipeline_started':
        return 'Pipeline initiated: Ingestion and architecture analysis started';
      case 'pipeline_restarted':
        return 'Pipeline reset: Ingestion and compilation restarting from scratch';
      case 'source_scanning':
        return `Scanning source codebase and documentation (${cleanSourceLabel(p.source || p.source_url)})`;
      case 'source_files_found':
        return `Discovered ${p.file_count || 0} relevant source files for ingestion`;
      case 'source_downloaded':
        return `Source files ingested successfully from ${cleanSourceLabel(p.source || p.source_url)}`;
      case 'archive_uploaded':
        return 'Source snapshot securely archived for synthesis';
      case 'llm_analysis_started':
        return 'Analyzing application architecture, dependencies, and service contracts';
      case 'inline_pass_started':
        return 'Synthesizing comprehensive architectural blueprint';
      case 'map_reduce_started':
        return `Performing distributed analysis across ${p.total_chunks || 'modular'} code modules`;
      case 'map_reduce_progress':
        return p.chunk && p.total_chunks 
          ? `Analyzing code modules (${p.chunk}/${p.total_chunks})` 
          : 'Analyzing code modules in parallel';
      case 'ingestion_complete': {
        const matches = p.matched_cross_kbs || 0;
        return `Ingestion complete: Discovered ${p.discovered_signatures || 0} interfaces${matches > 0 ? ` (${matches} cross-app connection${matches === 1 ? '' : 's'} identified)` : ''}`;
      }
      case 'compilation_started':
        return 'Synthesis phase: Generating structured OpenKB documentation pages';
      case 'page_compiled': {
        const topicName = p.topic || p.path?.replace(/^.*\//, '').replace(/\.md$/, '') || 'section';
        return `Compiled documentation section: ${topicName}`;
      }
      case 'compilation_complete':
        return `Compilation complete: Generated ${p.file_count || 0} OpenKB documentation pages`;
      case 'contracts_registered':
        return `Registered ${p.registered_contracts || 0} interface contracts into Organization Catalog`;
      case 'repo_provisioned':
        return 'Dedicated Knowledge Base repository provisioned on GitHub';
      case 'pr_opened':
        return 'Pull Request opened for review and publishing';
      case 'status_change': {
        const st = p.status || 'updated';
        return `Lifecycle stage transitioned to: ${st.replace(/_/g, ' ').toUpperCase()}`;
      }
      case 'gatekeeper_evaluation_started':
        return `Evaluating incremental changes from ${p.source_type?.toUpperCase() || 'source'} for architectural impact`;
      case 'gatekeeper_significant':
        return `Significant change detected: ${p.reason || 'Component updates require documentation sync'}`;
      case 'gatekeeper_trivial':
        return `Non-breaking change detected: ${p.reason || 'No documentation update required'}`;
      case 'gatekeeper_block':
        return `Knowledge base up to date: ${p.reason || 'Update skipped'}`;
      case 'patch_compilation_started':
        return 'Synthesizing documentation patch for updated components';
      case 'patch_compiled':
        return `Documentation patch generated (${p.file_count || 0} files updated)`;
      case 'diff_checked':
        return `Inspected diff (${p.commit_sha?.slice(0, 7) || 'HEAD'}): ${p.commit_message || 'Latest commit evaluated'}`;
      case 'diff_ingested':
        return `Incremental diff processed from ${p.source_type?.toUpperCase() || 'source'}`;
      case 'pipeline_error':
        return `Pipeline execution error: ${p.error || 'Check logs for details'}`;
      default:
        if (event.description) return sanitizeText(event.description);
        return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  };

  if (events.length === 0) {
    return <div className="text-center p-8 text-gray-500 font-mono text-sm border border-white/5 rounded-xl glass-card">No events recorded in the void yet.</div>;
  }

  return (
    <div className="glass-card p-4 rounded-xl max-h-[400px] overflow-y-auto space-y-4">
      {[...events].reverse().map((event: any, idx: number) => {
        const eventType = event.eventType || event.event_type || 'status_change';
        const desc = getEventDescription(event);
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
