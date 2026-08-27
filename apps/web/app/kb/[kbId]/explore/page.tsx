'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { FileText, Folder, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import { NebulaCard } from '@/components/space/nebula-card';

type TreeNode = {
  path: string;
  type: string;
  sha: string;
};

type FileTree = {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children?: FileTree[];
  isOpen?: boolean;
};

// Function to build tree from flat list
const buildTree = (nodes: TreeNode[]): FileTree[] => {
  const root: FileTree[] = [];
  
  if (!nodes || !Array.isArray(nodes)) return root;

  nodes.forEach(node => {
    const parts = node.path.split('/');
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      let existingPath = currentLevel.find(item => item.name === part);
      
      const isLeaf = index === parts.length - 1;
      const type = isLeaf ? node.type : 'tree';
      
      if (existingPath) {
        if (existingPath.type === 'tree' && !existingPath.children) {
          existingPath.children = [];
        }
        if (type === 'tree' || !isLeaf) {
          currentLevel = existingPath.children!;
        }
      } else {
        const newPart: FileTree = {
          name: part,
          path: isLeaf ? node.path : parts.slice(0, index + 1).join('/'),
          type: type as 'blob' | 'tree',
          children: type === 'tree' ? [] : undefined,
          isOpen: false
        };
        currentLevel.push(newPart);
        if (type === 'tree' || !isLeaf) {
          currentLevel = newPart.children!;
        }
      }
    });
  });
  
  return root;
};

export default function ExploreKBPage({ params }: { params: { kbId: string } }) {
  const [tree, setTree] = useState<FileTree[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getKBTree(params.kbId)
      .then(data => {
        setTree(buildTree(data.tree));
        setLoadingTree(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to load tree');
        setLoadingTree(false);
      });
  }, [params.kbId]);

  const loadFile = (path: string) => {
    setSelectedFile(path);
    setLoadingFile(true);
    setFileContent(null);
    api.getKBFile(params.kbId, path)
      .then(data => {
        setFileContent(data.content);
        setLoadingFile(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingFile(false);
      });
  };

  const toggleFolder = (node: FileTree, currentTree: FileTree[]): FileTree[] => {
    return currentTree.map(item => {
      if (item === node) {
        return { ...item, isOpen: !item.isOpen };
      }
      if (item.children) {
        return { ...item, children: toggleFolder(node, item.children) };
      }
      return item;
    });
  };

  const renderTree = (nodes: FileTree[]) => {
    return (
      <ul className="pl-4 space-y-1">
        {nodes.map((node, idx) => (
          <li key={idx}>
            {node.type === 'tree' ? (
              <div>
                <button
                  onClick={() => setTree(toggleFolder(node, tree))}
                  className="flex items-center gap-2 text-gray-300 hover:text-stellar w-full text-left py-1 text-sm font-mono"
                >
                  {node.isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <Folder className="w-4 h-4 text-stellar shrink-0" />
                  <span className="truncate">{node.name}</span>
                </button>
                {node.isOpen && node.children && renderTree(node.children)}
              </div>
            ) : (
              <button
                onClick={() => loadFile(node.path)}
                className={`flex items-center gap-2 w-full text-left py-1 text-sm font-mono pl-6 ${selectedFile === node.path ? 'text-orbit font-bold bg-orbit/10 rounded' : 'text-gray-400 hover:text-orbit'}`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{node.name}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // Preprocess [[wikilinks]] into markdown links for ReactMarkdown
  const preprocessWikilinks = (content: string): string => {
    return content.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_, target, anchor, title) => {
      const cleanTarget = target.trim();
      const label = title ? title.trim() : (cleanTarget.split('/').pop() || cleanTarget);
      const fullTarget = anchor ? `${cleanTarget}#${anchor}` : cleanTarget;
      if (cleanTarget.startsWith('ap:') || cleanTarget.startsWith('kb:')) {
        return `[${label}](#${fullTarget})`;
      }
      return `[${label}](#ap:${fullTarget})`;
    });
  };


  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <Link href={`/kb/${params.kbId}`} className="text-gray-400 hover:text-white flex items-center gap-2 font-mono text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
        </Link>
        <h1 className="text-2xl font-space font-bold text-white">Explore Knowledge Base</h1>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        <div className="w-80 shrink-0 overflow-y-auto">
          <NebulaCard title="Repository" glow="none" className="h-full flex flex-col">
            {loadingTree ? (
              <div className="text-gray-500 font-mono text-sm p-4">Loading tree...</div>
            ) : error ? (
              <div className="text-red-500 font-mono text-sm p-4">{error}</div>
            ) : (
              <div className="-ml-4 mt-2">
                {renderTree(tree)}
              </div>
            )}
          </NebulaCard>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a14]/80 p-8 shadow-2xl backdrop-blur-xl">
          {loadingFile ? (
            <div className="text-gray-500 font-mono flex items-center justify-center h-full">Loading file...</div>
          ) : fileContent ? (
            <div className="prose prose-invert prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 max-w-none">
              <ReactMarkdown
                components={{
                  a: ({ href, children, ...props }) => {
                    if (href && (href.startsWith('#ap:') || href.startsWith('#kb:') || href.endsWith('.md') || !href.startsWith('http'))) {
                      let targetPath = href.replace(/^#(?:ap|kb):/, '').replace(/^\.\//, '');
                      if (!targetPath.endsWith('.md') && !targetPath.includes('#')) {
                        targetPath = `${targetPath}.md`;
                      }
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            loadFile(targetPath);
                          }}
                          className="text-orbit hover:text-stellar underline underline-offset-4 inline-flex items-center gap-0.5 font-medium transition-colors cursor-pointer text-left"
                        >
                          {children}
                        </button>
                      );
                    }

                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-orbit hover:underline" {...props}>
                        {children}
                      </a>
                    );
                  }
                }}
              >
                {preprocessWikilinks(fileContent)}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-gray-500 font-mono flex flex-col items-center justify-center h-full gap-4">
              <FileText className="w-16 h-16 opacity-20" />
              <p>Select a file from the sidebar to view its contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
