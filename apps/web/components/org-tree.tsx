'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, ChevronRight, Rocket } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { OrgTreeNode } from '@/types/kb';
import Link from 'next/link';

interface OrgTreeProps {
  data?: OrgTreeNode[];
  node?: OrgTreeNode;
  level?: number;
}

export function OrgTree({ data, node, level = 0 }: OrgTreeProps) {
  const nodes = data || (node ? [node] : []);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(nodes.map(d => d.id)));

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  return (
    <div className="font-mono text-sm space-y-1">
      {nodes.map((node) => {
        const apps = node.apps || (node as any).knowledgeBases || (node as any).knowledge_bases || [];
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = (node.children && node.children.length > 0) || (apps.length > 0);
        
        return (
          <div key={node.id}>
            <div 
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded transition-colors group cursor-pointer"
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => hasChildren ? toggleExpand(node.id) : undefined}
            >
              <span className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                {hasChildren ? <ChevronRight className="w-3.5 h-3.5" /> : <span className="w-3.5 inline-block" />}
              </span>
              <Folder className="w-4 h-4 text-gray-400 group-hover:text-stellar transition-colors" />
              <Link href={`/orgs/${node.slug || node.id}`} className="text-gray-300 hover:text-white truncate" onClick={e => e.stopPropagation()}>
                {node.name}
              </Link>
              {apps.length > 0 && (
                <span className="ml-auto bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400">
                  {apps.length}
                </span>
              )}
            </div>

            <AnimatePresence>
              {isExpanded && hasChildren && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-l border-white/10 ml-4">
                    {node.children && <OrgTree data={node.children} level={level + 1} />}
                    
                    {apps.map((app: any) => (
                      <Link 
                        href={`/kb/${app.id}`} 
                        key={app.id}
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-white/5 rounded transition-colors group ml-2"
                        style={{ paddingLeft: `${(level + 1) * 16}px` }}
                      >
                        <div className="flex items-center gap-2">
                          <Rocket className="w-3.5 h-3.5 text-nebula-light" />
                          <span className="text-gray-400 group-hover:text-white truncate">{app.appName || app.app_name}</span>
                        </div>
                        <StatusBadge status={app.status} size="sm" showLabel={false} />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
