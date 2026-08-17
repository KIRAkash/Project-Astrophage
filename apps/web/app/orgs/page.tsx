'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import Link from 'next/link';
import { Plus, Folder, LayoutGrid } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Org } from '@/types/kb';

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrgs().then((res) => {
      setOrgs(Array.isArray(res) ? res : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-space font-bold">Organizations</h1>
          <p className="text-gray-400 font-mono mt-2">Manage your knowledge base sectors.</p>
        </div>
        <Link href="/orgs/new" className="bg-nebula/20 text-nebula-light hover:bg-nebula/30 border border-nebula/50 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]">
          <Plus className="w-4 h-4" /> New Organization
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500 font-mono">Loading organizations...</div>
      ) : orgs.length === 0 ? (
        <div className="text-gray-500 font-mono">No organizations found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs.map((org) => (
            <Link key={org.id} href={`/orgs/${org.id}`}>
              <NebulaCard glow="cyan" className="cursor-pointer h-full group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-white/5 group-hover:bg-stellar/20 transition-colors">
                    <LayoutGrid className="w-6 h-6 text-stellar" />
                  </div>
                </div>
                <h3 className="text-xl font-space font-semibold mb-4">{org.name}</h3>
                <div className="text-sm font-mono text-gray-400">
                  <span className="text-gray-500">ID:</span> {org.slug}
                </div>
              </NebulaCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
