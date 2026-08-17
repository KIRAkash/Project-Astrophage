'use client';
import { KnowledgeBase } from '@/types/kb';
import { StatusBadge } from './status-badge';
import Link from 'next/link';
import { ExternalLink, GitBranch } from 'lucide-react';
import { NebulaCard } from './space/nebula-card';

interface KBTableProps {
  kbs: KnowledgeBase[];
}

export function KBTable({ kbs }: KBTableProps) {
  if (!kbs || kbs.length === 0) {
    return (
      <div className="text-center py-16 border border-white/10 border-dashed rounded-xl glass-card">
        <div className="w-16 h-16 rounded-full bg-void border border-white/10 mx-auto flex items-center justify-center mb-4 text-3xl">
          🌌
        </div>
        <h3 className="text-xl font-space font-semibold">The Void is Empty</h3>
        <p className="text-gray-400 font-mono text-sm mt-2 max-w-sm mx-auto">
          No knowledge bases have been launched yet. Select an organization to deploy one.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-6 py-4 font-normal">Application</th>
              <th className="px-6 py-4 font-normal">Organization</th>
              <th className="px-6 py-4 font-normal">Status</th>
              <th className="px-6 py-4 font-normal">Sources</th>
              <th className="px-6 py-4 font-normal">Updated</th>
              <th className="px-6 py-4 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {kbs.map((kb) => (
              <tr key={kb.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <Link href={`/kb/${kb.id}`} className="font-semibold text-white hover:text-stellar transition-colors">
                    {kb.appName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  <Link href={`/orgs/${kb.orgId}`} className="hover:text-white transition-colors">
                    {kb.orgId}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={kb.status} size="sm" />
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {kb.sourceUrls.length} sources
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(kb.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {kb.prUrl ? (
                    <a href={kb.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pulsar hover:text-white transition-colors">
                      <GitBranch className="w-3 h-3" /> PR <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link href={`/kb/${kb.id}`} className="text-stellar hover:text-white transition-colors">
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
