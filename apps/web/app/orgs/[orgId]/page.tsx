'use client';
import { OrgTree } from '@/components/org-tree';
import { NebulaCard } from '@/components/space/nebula-card';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Org, KnowledgeBase } from '@/types/kb';

export default function OrgDetailPage({ params }: { params: { orgId: string } }) {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrgTree(params.orgId).then((data) => {
      setOrg(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [params.orgId]);

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto text-gray-500 font-mono">Loading organization details...</div>;
  }

  if (!org) {
    return <div className="p-8 max-w-7xl mx-auto text-red-500 font-mono">Organization not found.</div>;
  }

  const apps = org.apps || (org as any).knowledgeBases || (org as any).knowledge_bases || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-mono text-gray-500 mb-2">
            <Link href="/orgs" className="hover:text-stellar">Orgs</Link> / {org.slug}
          </div>
          <h1 className="text-3xl font-space font-bold">{org.name}</h1>
        </div>
        <div className="flex gap-4">
          <Link href={`/orgs/${org.slug || org.id}/apps/new`} className="bg-stellar/20 text-stellar hover:bg-stellar/30 border border-stellar/50 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Add Application
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <NebulaCard title="Structure" className="h-full">
            <div className="mt-4">
              <OrgTree node={org} />
            </div>
          </NebulaCard>
        </div>
        
        <div className="lg:col-span-3">
          <NebulaCard title="Applications">
             {apps.length > 0 ? (
               <div className="space-y-4 mt-4">
                 {apps.map((kb: any) => (
                   <Link href={`/kb/${kb.id}`} key={kb.id} className="block p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                     <div className="flex justify-between items-center">
                       <h4 className="font-space font-semibold">{kb.appName || kb.app_name}</h4>
                       <span className="text-xs font-mono px-2 py-1 bg-white/10 rounded">{kb.status}</span>
                     </div>
                   </Link>
                 ))}
               </div>
             ) : (
               <div className="p-8 text-center text-gray-500 font-mono border border-white/5 rounded-lg border-dashed">
                  No applications launched yet.
               </div>
             )}
          </NebulaCard>
        </div>
      </div>
    </div>
  );
}
