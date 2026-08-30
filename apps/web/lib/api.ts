import { Org, KnowledgeBase } from '@/types/kb';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
}

export const api = {
  getOrgs: () => apiFetch('/api/orgs') as Promise<Org[]>,
  getOrgTree: (id: string) => apiFetch(`/api/orgs/${id}/tree`) as Promise<Org>,
  createOrg: (data: Partial<Org>) => apiFetch('/api/orgs', { method: 'POST', body: JSON.stringify(data) }) as Promise<Org>,
  createApp: (orgId: string, data: Partial<KnowledgeBase>) => apiFetch(`/api/orgs/${orgId}/apps`, { method: 'POST', body: JSON.stringify(data) }) as Promise<KnowledgeBase>,
  getKB: (id: string) => apiFetch(`/api/kb/${id}`) as Promise<KnowledgeBase & { events: any[] }>,
  syncKB: (id: string) => apiFetch(`/api/kb/${id}/sync`, { method: 'POST' }) as Promise<KnowledgeBase & { events: any[] }>,
  addKBSource: (id: string, source: any) => apiFetch(`/api/kb/${id}/add-source`, { method: 'POST', body: JSON.stringify(source) }) as Promise<{ status: string; message: string; kb: KnowledgeBase & { events: any[] } }>,
  checkKBUpdates: (id: string) => apiFetch(`/api/kb/${id}/check-updates`, { method: 'POST' }) as Promise<{
    status: string;
    message?: string;
    sources_scanned?: {
      source_type: string;
      source_url: string;
      status: string;
      summary?: string;
      affected_items?: string[];
      message?: string;
    }[];
    triggered_count?: number;
    commit_sha?: string;
    commit_message?: string;
    author?: string;
    files_changed?: string[];
  }>,

  restartKB: (id: string) => apiFetch(`/api/kb/${id}/restart`, { method: 'POST' }) as Promise<KnowledgeBase & { events: any[] }>,
  retryKB: (id: string) => apiFetch(`/api/kb/${id}/retry`, { method: 'POST' }) as Promise<KnowledgeBase & { events: any[] }>,
  listKBs: () => apiFetch('/api/kb') as Promise<KnowledgeBase[]>,
  getKBTree: (id: string) => apiFetch(`/api/kb/${id}/tree`) as Promise<{tree: {path: string, type: string, sha: string}[]}>,
  getKBFile: (id: string, path: string) => apiFetch(`/api/kb/${id}/file?path=${encodeURIComponent(path)}`) as Promise<{content: string}>,
  resolveKB: (target: string) => apiFetch(`/api/kb/resolve?target=${encodeURIComponent(target)}`) as Promise<{kb_id: string, app_name: string, git_repo_url: string}>,
};
