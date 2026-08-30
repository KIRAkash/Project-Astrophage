'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { FileText, Folder, ChevronRight, ChevronDown, ArrowLeft, ExternalLink, Compass } from 'lucide-react';
import { NebulaCard } from '@/components/space/nebula-card';
import { KnowledgeBase } from '@/types/kb';

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
const buildTree = (nodes: TreeNode[], activePath?: string | null): FileTree[] => {
  const root: FileTree[] = [];
  
  if (!nodes || !Array.isArray(nodes)) return root;

  nodes.forEach(node => {
    const parts = node.path.split('/');
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      let existingPath = currentLevel.find(item => item.name === part);
      
      const isLeaf = index === parts.length - 1;
      const type = isLeaf ? node.type : 'tree';
      const nodePath = isLeaf ? node.path : parts.slice(0, index + 1).join('/');
      const isParentOfActive = activePath ? activePath.startsWith(nodePath + '/') : false;
      
      if (existingPath) {
        if (existingPath.type === 'tree' && !existingPath.children) {
          existingPath.children = [];
        }
        if (isParentOfActive) {
          existingPath.isOpen = true;
        }
        if (type === 'tree' || !isLeaf) {
          currentLevel = existingPath.children!;
        }
      } else {
        const newPart: FileTree = {
          name: part,
          path: nodePath,
          type: type as 'blob' | 'tree',
          children: type === 'tree' ? [] : undefined,
          isOpen: isParentOfActive || false
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

const slugify = (text: any): string => {
  if (typeof text === 'string') {
    return text.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (Array.isArray(text)) {
    return text.map(slugify).join('-');
  }
  if (text && typeof text === 'object' && text.props && text.props.children) {
    return slugify(text.props.children);
  }
  return '';
};

export default function ExploreKBPage({ params }: { params: { kbId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFileParam = searchParams.get('file');

  const [tree, setTree] = useState<FileTree[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFileParam);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allKBs, setAllKBs] = useState<KnowledgeBase[]>([]);
  const [targetAnchor, setTargetAnchor] = useState<string | null>(null);

  // Load all KBs in the organization to resolve cross-KB links
  useEffect(() => {
    api.listKBs()
      .then(kbs => setAllKBs(kbs || []))
      .catch(err => console.warn('Could not list KBs for cross-linking:', err));
  }, []);

  // Load tree and initial file
  useEffect(() => {
    setLoadingTree(true);
    api.getKBTree(params.kbId)
      .then(data => {
        const fileToOpen = initialFileParam || 'index.md';
        const fileExists = data.tree.some(t => t.path === fileToOpen);
        const resolvedInitial = fileExists ? fileToOpen : (data.tree.find(t => t.path.endsWith('.md'))?.path || null);
        
        setTree(buildTree(data.tree, resolvedInitial));
        setLoadingTree(false);

        if (resolvedInitial) {
          loadFile(resolvedInitial);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to load tree');
        setLoadingTree(false);
      });
  }, [params.kbId]);

  // If query param ?file changes (e.g. via navigation)
  useEffect(() => {
    const fileParam = searchParams.get('file');
    if (fileParam && fileParam !== selectedFile) {
      loadFile(fileParam);
    }
  }, [searchParams]);

  // Handle anchor scroll
  useEffect(() => {
    if (fileContent && typeof window !== 'undefined') {
      const hash = targetAnchor || window.location.hash.replace(/^#/, '');
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash) || 
                     document.getElementById(decodeURIComponent(hash)) ||
                     document.getElementById(slugify(hash));
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('bg-orbit/20', 'transition-colors', 'duration-1000');
            setTimeout(() => el.classList.remove('bg-orbit/20'), 2500);
          }
        }, 200);
      }
    }
  }, [fileContent, targetAnchor]);

  const loadFile = (path: string, anchor?: string) => {
    const cleanPath = path.split('#')[0].trim().replace(/^\.\//, '');
    const finalPath = (!cleanPath.endsWith('.md') && !cleanPath.includes('.')) ? `${cleanPath}.md` : cleanPath;
    
    setSelectedFile(finalPath);
    setLoadingFile(true);
    setFileContent(null);
    if (anchor) setTargetAnchor(anchor);

    // Expand parent folders in sidebar tree
    setTree(currentTree => {
      const openParents = (nodes: FileTree[]): FileTree[] => {
        return nodes.map(node => {
          const isParent = finalPath.startsWith(node.path + '/');
          return {
            ...node,
            isOpen: isParent ? true : node.isOpen,
            children: node.children ? openParents(node.children) : undefined
          };
        });
      };
      return openParents(currentTree);
    });

    api.getKBFile(params.kbId, finalPath)
      .then(data => {
        setFileContent(data.content);
        setLoadingFile(false);
      })
      .catch(err => {
        console.error(`Failed to load ${finalPath}:`, err);
        setError(`Failed to load file: ${finalPath}`);
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

  const handleCrossKBNavigation = async (targetRepo: string, targetPath: string, anchor?: string) => {
    const cleanTargetRepo = targetRepo.trim().toLowerCase();
    let cleanPath = targetPath.trim().replace(/^\.\//, '');
    if (!cleanPath.endsWith('.md') && !cleanPath.includes('.')) {
      cleanPath = `${cleanPath}.md`;
    }

    // 1. Check loaded KBs list
    let targetKB = allKBs.find(kb => {
      if (kb.id === cleanTargetRepo) return true;
      const repoUrl = kb.gitRepoUrl || kb.git_repo_url;
      if (repoUrl) {
        const repoSlug = repoUrl.replace(/\/+$/, '').split('/').pop()?.toLowerCase();
        if (repoSlug === cleanTargetRepo || repoSlug?.replace('.git', '') === cleanTargetRepo) return true;
      }
      const rawName = kb.appName || kb.app_name || '';
      const cleanApp = rawName.toLowerCase().replace(/[\s_]+/g, '-');
      if (cleanApp && (cleanApp === cleanTargetRepo || rawName.toLowerCase() === cleanTargetRepo)) return true;
      if (cleanApp && (cleanTargetRepo.endsWith(cleanApp) || cleanTargetRepo.includes(cleanApp))) return true;
      return false;
    });

    // 2. Fallback to backend resolver API
    let targetKbId = targetKB?.id;
    if (!targetKbId) {
      try {
        const res = await api.resolveKB(cleanTargetRepo);
        if (res && res.kb_id) {
          targetKbId = res.kb_id;
        }
      } catch (e) {
        console.warn(`Could not resolve cross-KB target ${cleanTargetRepo}:`, e);
      }
    }

    if (targetKbId) {
      if (targetKbId === params.kbId) {
        // In the same KB, open file directly
        loadFile(cleanPath, anchor);
      } else {
        // Navigate to the other KB's explore page
        const anchorHash = anchor ? `#${encodeURIComponent(anchor)}` : '';
        router.push(`/kb/${targetKbId}/explore?file=${encodeURIComponent(cleanPath)}${anchorHash}`);
      }
    } else {
      alert(`Knowledge Base '${targetRepo}' is not yet registered or indexed in this organization.`);
    }
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

  // Preprocess markdown content: strip HTML comments/anchors, normalize collapsed tables & convert [[wikilinks]]
  const preprocessMarkdown = (content: string): string => {
    if (!content) return '';

    // 1. Strip all HTML comments (e.g. <!-- anchor: ... -->)
    let cleaned = content.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Separate headings glued directly to subsequent text (e.g. ## Heading`Code`Text)
    cleaned = cleaned.replace(/(#{1,6}[^\n`]+`[^`\n]+`)([A-Z][a-z])/g, '$1\n\n$2');

    // 3. Break collapsed table rows ("||" or "| |") into newlines ("|\n|")
    cleaned = cleaned.replace(/\|\s*\|\s*/g, '|\n| ');

    // 4. Ensure a blank line before the start of a Markdown table
    cleaned = cleaned.replace(/([^\n|])\s*(\|[ \t]*[A-Za-z0-9_`].*?\|\s*\n\s*\|[\s:\-|]+\|)/g, '$1\n\n$2');

    // 5. Preprocess [[wikilinks]] and [[ap:...]] cross-links into structured markdown links
    cleaned = cleaned.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_, target, anchor, title) => {
      const cleanTarget = target.trim();
      const label = title ? title.trim() : (cleanTarget.split('/').pop() || cleanTarget);
      const anchorSuffix = anchor ? `#${anchor.trim()}` : '';

      if (cleanTarget.startsWith('ap:') || cleanTarget.startsWith('kb:')) {
        // Cross-KB link: #cross:target-repo/path#anchor
        const strippedTarget = cleanTarget.replace(/^(?:ap|kb):/, '');
        return `[${label}](#cross:${strippedTarget}${anchorSuffix})`;
      }
      
      // Internal link: #internal:path#anchor
      return `[${label}](#internal:${cleanTarget}${anchorSuffix})`;
    });

    return cleaned;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <Link href={`/kb/${params.kbId}`} className="text-gray-400 hover:text-white flex items-center gap-2 font-mono text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-orbit" />
            OpenKB Explorer
          </span>
          <h1 className="text-2xl font-space font-bold text-white">Explore Knowledge Base</h1>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        <div className="w-80 shrink-0 overflow-y-auto">
          <NebulaCard title="Repository Vault" glow="none" className="h-full flex flex-col">
            {loadingTree ? (
              <div className="text-gray-500 font-mono text-sm p-4">Loading tree...</div>
            ) : error && !tree.length ? (
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
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, ...props }) => {
                    const id = slugify(children);
                    return <h1 id={id} className="scroll-mt-6" {...props}>{children}</h1>;
                  },
                  h2: ({ children, ...props }) => {
                    const id = slugify(children);
                    return <h2 id={id} className="scroll-mt-6" {...props}>{children}</h2>;
                  },
                  h3: ({ children, ...props }) => {
                    const id = slugify(children);
                    return <h3 id={id} className="scroll-mt-6" {...props}>{children}</h3>;
                  },
                  h4: ({ children, ...props }) => {
                    const id = slugify(children);
                    return <h4 id={id} className="scroll-mt-6" {...props}>{children}</h4>;
                  },
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto my-6 rounded-lg border border-white/10 bg-[#0d0d1a]/80 shadow-md">
                      <table className="w-full text-left border-collapse text-sm font-mono" {...props}>
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children, ...props }) => (
                    <thead className="bg-white/5 border-b border-white/10 text-gray-300 font-semibold uppercase text-xs tracking-wider" {...props}>
                      {children}
                    </thead>
                  ),
                  tbody: ({ children, ...props }) => (
                    <tbody className="divide-y divide-white/5 text-gray-300" {...props}>
                      {children}
                    </tbody>
                  ),
                  th: ({ children, ...props }) => (
                    <th className="px-4 py-3 text-white font-medium whitespace-nowrap" {...props}>
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td className="px-4 py-3 text-gray-300 border-t border-white/5" {...props}>
                      {children}
                    </td>
                  ),
                  a: ({ href, children, ...props }) => {
                    if (!href) return <a {...props}>{children}</a>;

                    // 1. Cross-KB Links
                    if (href.startsWith('#cross:')) {
                      const rawTarget = href.replace(/^#cross:/, '');
                      const [fullPath, anchor] = rawTarget.split('#');
                      const firstSlash = fullPath.indexOf('/');
                      const targetRepo = firstSlash !== -1 ? fullPath.slice(0, firstSlash) : fullPath;
                      const targetPath = firstSlash !== -1 ? fullPath.slice(firstSlash + 1) : 'index.md';

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCrossKBNavigation(targetRepo, targetPath, anchor);
                          }}
                          className="inline-flex items-center gap-1.5 text-stellar bg-stellar/10 hover:bg-stellar/20 border border-stellar/30 hover:border-stellar/60 px-2 py-0.5 rounded text-xs font-mono font-medium transition-all cursor-pointer mx-1 align-baseline shadow-sm"
                          title={`Cross-Application Link to ${targetRepo}`}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 text-stellar" />
                          <span>{children}</span>
                        </button>
                      );
                    }

                    // 2. Internal Vault Wikilinks
                    if (href.startsWith('#internal:')) {
                      const rawTarget = href.replace(/^#internal:/, '');
                      const [targetPath, anchor] = rawTarget.split('#');
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            loadFile(targetPath, anchor);
                          }}
                          className="text-orbit hover:text-stellar underline underline-offset-4 inline-flex items-center gap-0.5 font-medium transition-colors cursor-pointer text-left"
                        >
                          {children}
                        </button>
                      );
                    }

                    // 3. Fallback for Markdown relative links
                    if (!href.startsWith('http') && !href.startsWith('mailto:')) {
                      const cleanHref = href.replace(/^#/, '').replace(/^\.\//, '');
                      const [targetPath, anchor] = cleanHref.split('#');
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            loadFile(targetPath, anchor);
                          }}
                          className="text-orbit hover:text-stellar underline underline-offset-4 inline-flex items-center gap-0.5 font-medium transition-colors cursor-pointer text-left"
                        >
                          {children}
                        </button>
                      );
                    }

                    // 4. External Web Links
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-orbit hover:underline inline-flex items-center gap-1" {...props}>
                        {children}
                        <ExternalLink className="w-3 h-3 inline opacity-70" />
                      </a>
                    );
                  }
                }}
              >
                {preprocessMarkdown(fileContent)}
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
