'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OrbitLoader } from '@/components/space/orbit-loader';

import { api } from '@/lib/api';

export default function NewOrgPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', githubOrg: '' });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newOrg = await api.createOrg({
        name: formData.name,
        slug: formData.slug,
        githubOrg: formData.githubOrg.trim() ? formData.githubOrg.trim() : undefined,
      });
      router.push(`/orgs/${newOrg.slug || newOrg.id}`);
    } catch (err: any) {
      console.error("Failed to create org:", err);
      setError(err?.message || "Failed to create organization");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-space font-bold">New Organization</h1>
        <p className="text-gray-400 font-mono mt-2">Establish a new sector in the void.</p>
      </div>

      <NebulaCard glow="purple">
        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <OrbitLoader size="md" label="Constructing Sector..." />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">Organization Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={handleNameChange}
                className="w-full bg-void border border-white/10 rounded-lg px-4 py-2 font-mono text-white focus:outline-none focus:border-nebula focus:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">Slug</label>
              <input 
                type="text" 
                required
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                className="w-full bg-void/50 border border-white/5 rounded-lg px-4 py-2 font-mono text-gray-400 focus:outline-none"
                placeholder="acme-corp"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">GitHub Organization (Optional)</label>
              <input 
                type="text" 
                value={formData.githubOrg}
                onChange={(e) => setFormData({...formData, githubOrg: e.target.value})}
                className="w-full bg-void border border-white/10 rounded-lg px-4 py-2 font-mono text-white focus:outline-none focus:border-stellar focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                placeholder="e.g. acme-corp"
              />
            </div>
            <div className="pt-4 flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => router.back()}
                className="px-6 py-2 rounded-lg font-mono text-sm border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-nebula/20 text-nebula-light hover:bg-nebula/30 border border-nebula/50 px-6 py-2 rounded-lg font-mono text-sm shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
              >
                Create Organization
              </button>
            </div>
          </form>
        )}
      </NebulaCard>
    </div>
  );
}
