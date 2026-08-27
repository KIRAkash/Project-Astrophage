export type KBStatus = 'queued' | 'ingesting' | 'generating' | 'in_review' | 'published' | 'failed';
export type SourceType = 'github' | 'confluence' | 'notion' | 'slack' | 'jira' | 'upload';

export interface SourceItem {
  type: SourceType;
  url: string;
  incrementalEnabled?: boolean;
  config?: Record<string, any>;
}

export interface SourceMonitor {
  id: string;
  kbId: string;
  sourceType: SourceType;
  sourceUrl?: string;
  repoUrl: string;
  incrementalEnabled: boolean;
  monitorMode: 'webhook' | 'polling';
  lastCommitSha?: string;
  lastSyncState?: Record<string, any>;
  config?: Record<string, any>;
  lastSyncedAt?: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  parentOrgId: string | null;
  githubOrg?: string;
  children?: Org[];
  apps?: KnowledgeBase[];
}

export interface KnowledgeBase {
  id: string;
  orgId: string;
  appName: string;
  status: KBStatus;
  sourceUrls: SourceItem[];
  sourceMonitors?: SourceMonitor[];
  gitRepoUrl?: string;
  prUrl?: string;
  orgPrUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type KBEventType = 'status_change' | 'gatekeeper_pass' | 'gatekeeper_block' | 'pr_opened' | 'diff_ingested' | 'diff_checked' | 'pipeline_started' | 'pipeline_error';

export interface KBEvent {
  id: string;
  kbId: string;
  eventType: KBEventType;
  payload?: Record<string, any>;
  description?: string;
  timestamp: string;
}

export interface OrgTreeNode extends Org {
  isExpanded?: boolean;
}

