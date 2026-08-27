'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { SourceUrlInput } from '@/components/source-url-input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OrbitLoader } from '@/components/space/orbit-loader';
import { SourceItem } from '@/types/kb';

import { api } from '@/lib/api';

export default function NewAppPage({ params }: { params: { orgId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sources, setSources] = useState<SourceItem[]>([
    { type: 'github', url: '', incrementalEnabled: true, config: {} }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const validSources = sources.filter(s => s.type === 'upload' || (s.url && s.url.trim() !== ''));
      if (validSources.length === 0) {
        throw new Error("Please provide at least one valid source connector URL or file");
      }
      const newKb = await api.createApp(params.orgId, {
        appName: name,
        sourceUrls: validSources
      });
      router.push(`/kb/${newKb.id}`);
    } catch (err: any) {
      console.error("Failed to deploy knowledge base:", err);
      setError(err?.message || "Failed to deploy knowledge base");
      setLoading(false);
    }
  };


  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-space font-bold">Add Application</h1>
        <p className="text-gray-400 font-mono mt-2">Deploy a new knowledge base in {params.orgId}.</p>
      </div>

      <NebulaCard glow="cyan">
        {loading ? (
          <div className="py-16 flex flex-col items-center">
            <OrbitLoader size="lg" label="Initializing Astrophage Knowledge Base..." />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">Application Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-void border border-white/10 rounded-lg px-4 py-2 font-mono text-white focus:outline-none focus:border-stellar focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                placeholder="e.g. Payment Gateway Service"
              />
            </div>
            
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">Data Sources</label>
              <SourceUrlInput sources={sources} onChange={setSources} />
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => router.back()}
                className="px-6 py-2 rounded-lg font-mono text-sm border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-stellar/20 text-stellar hover:bg-stellar/30 border border-stellar/50 px-6 py-2 rounded-lg font-mono text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                Deploy Knowledge Base
              </button>
            </div>
          </form>
        )}
      </NebulaCard>
    </div>
  );
}
