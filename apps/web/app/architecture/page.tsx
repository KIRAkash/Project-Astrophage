"use client";

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Position,
  OnSelectionChangeParams,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DraggableEdge from './DraggableEdge';

// === Astrophage Video Theme Mapping ===
const THEME = {
  colors: {
    bgDark: '#070B19',
    bgDarker: '#040711',
    bgCard: 'rgba(15, 23, 42, 0.75)',
    cyan: '#00D2FF',
    electricBlue: '#38BDF8',
    purple: '#7928CA',
    neonPurple: '#B026FF',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    borderGlowCyan: 'rgba(0, 210, 255, 0.35)',
    borderGlowPurple: 'rgba(176, 38, 255, 0.35)',
    borderSubtle: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#FFFFFF',
    textSecondary: "#94A3B8",
    gray: '#9CA3AF'
  }
};

const THEME_PRESETS = {
  amber: { r: 245, g: 158, b: 11, hex: THEME.colors.amber },
  emerald: { r: 16, g: 185, b: 129, hex: THEME.colors.emerald },
  cyan: { r: 0, g: 210, b: 255, hex: THEME.colors.cyan },
  purple: { r: 176, g: 38, b: 255, hex: THEME.colors.neonPurple },
  rose: { r: 244, g: 63, b: 94, hex: THEME.colors.rose },
  white: { r: 255, g: 255, b: 255, hex: THEME.colors.textPrimary },
  gray: { r: 156, g: 163, b: 175, hex: THEME.colors.gray },
};

// --- Shape Generators ---
const getBadgeStyle = (colorPreset: keyof typeof THEME_PRESETS) => {
  const { r, g, b, hex } = THEME_PRESETS[colorPreset];
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.12)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.4)`,
    color: hex,
    boxShadow: `0 0 15px rgba(${r}, ${g}, ${b}, 0.3)`,
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '12px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    padding: '10px',
  };
};

const getGlassCardStyle = (colorPreset: keyof typeof THEME_PRESETS) => {
  const { r, g, b } = THEME_PRESETS[colorPreset];
  return {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(7, 11, 25, 0.92) 100%)',
    backdropFilter: 'blur(16px)',
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.35)`,
    boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(${r}, ${g}, ${b}, 0.2)`,
    color: THEME.colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '10px',
  };
};

// --- Custom Nodes for 4-Sided Connections ---
const HandleSet = () => (
  <>
    {/* Top Edge */}
    <Handle type="target" position={Position.Top} id="t-top" className="custom-handle" style={{ left: '40%' }} />
    <Handle type="source" position={Position.Top} id="s-top-alt" className="custom-handle" style={{ left: '40%' }} />
    <Handle type="target" position={Position.Top} id="t-top-alt" className="custom-handle" style={{ left: '60%' }} />
    <Handle type="source" position={Position.Top} id="s-top" className="custom-handle" style={{ left: '60%' }} />

    {/* Right Edge */}
    <Handle type="target" position={Position.Right} id="t-right" className="custom-handle" style={{ top: '40%' }} />
    <Handle type="source" position={Position.Right} id="s-right-alt" className="custom-handle" style={{ top: '40%' }} />
    <Handle type="target" position={Position.Right} id="t-right-alt" className="custom-handle" style={{ top: '60%' }} />
    <Handle type="source" position={Position.Right} id="s-right" className="custom-handle" style={{ top: '60%' }} />

    {/* Bottom Edge */}
    <Handle type="target" position={Position.Bottom} id="t-bottom" className="custom-handle" style={{ left: '40%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom-alt" className="custom-handle" style={{ left: '40%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom-alt" className="custom-handle" style={{ left: '60%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" className="custom-handle" style={{ left: '60%' }} />

    {/* Left Edge */}
    <Handle type="target" position={Position.Left} id="t-left" className="custom-handle" style={{ top: '40%' }} />
    <Handle type="source" position={Position.Left} id="s-left-alt" className="custom-handle" style={{ top: '40%' }} />
    <Handle type="target" position={Position.Left} id="t-left-alt" className="custom-handle" style={{ top: '60%' }} />
    <Handle type="source" position={Position.Left} id="s-left" className="custom-handle" style={{ top: '60%' }} />
  </>
);

const UniversalNode = ({ data, selected }: any) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: data.iconUrl ? 'center' : 'space-between', padding: data.iconUrl ? '0' : '0 15px', boxSizing: 'border-box', position: 'relative' }} className={selected ? 'selected-node-container' : ''}>
      {data.iconUrl ? (
        <img src={data.iconUrl} alt={data.label} style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: data.inlineIcon ? 'flex-start' : 'center', gap: '12px' }}>
          {data.inlineIcon && <img src={data.inlineIcon} alt="Icon" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />}
          <span style={{ textAlign: 'left', flex: 1 }}>{data.label}</span>
        </div>
      )}

      {data.googleServiceIcon && (
        <div style={{ width: 37, height: 37, borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', flexShrink: 0, position: 'absolute', right: '4px' }}>
          <img src={data.googleServiceIcon} alt="Google Service" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        </div>
      )}
      <HandleSet />
    </div>
  );
};

const UniversalGroupNode = ({ data, selected }: any) => {
  return (
    <div style={{ width: '100%', height: '100%' }} className={selected ? 'selected-node-container' : ''}>
      <div className="react-flow__node-group-label">{data.label}</div>
      <HandleSet />
    </div>
  );
};

const defaultNodeConfig = {
  type: 'universal',
};

const initialNodes: Node[] = [
  // Group: User & Auth
  { id: 'User', data: { label: '👤 Developer / User' }, position: { x: -150, y: -50 }, ...defaultNodeConfig, style: { ...getBadgeStyle('white'), borderRadius: '999px', width: 220, height: 50, background: 'rgba(255,255,255,0.1)' } },
  { id: 'Auth', data: { label: 'Firebase Auth', googleServiceIcon: '/assets/google/firebase.webp' }, position: { x: -150, y: 60 }, ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), borderRadius: '24px', width: 220, height: 50 } },

  // Group: Data Sources
  { id: 'group_sources', type: 'universalGroup', data: { label: 'Sources' }, position: { x: 135, y: -50 }, style: { width: 90, height: 600, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' } },
  { id: 'GH', data: { label: 'GitHub', iconUrl: '/assets/sources/github.png' }, position: { x: 20, y: 50 }, parentId: 'group_sources', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), borderRadius: '50%', width: 50, height: 50 } },
  { id: 'Jira', data: { label: 'Jira', iconUrl: '/assets/sources/jira-1.svg' }, position: { x: 20, y: 160 }, parentId: 'group_sources', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), borderRadius: '50%', width: 50, height: 50 } },
  { id: 'Conf', data: { label: 'Confluence', iconUrl: '/assets/sources/Confluence.png' }, position: { x: 20, y: 270 }, parentId: 'group_sources', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), borderRadius: '50%', width: 50, height: 50 } },
  { id: 'Notion', data: { label: 'Notion', iconUrl: '/assets/sources/Notion_app_logo.png' }, position: { x: 20, y: 380 }, parentId: 'group_sources', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), borderRadius: '50%', width: 50, height: 50 } },
  { id: 'Slack', data: { label: 'Slack', iconUrl: '/assets/sources/Slack_icon_2019.svg.webp' }, position: { x: 20, y: 490 }, parentId: 'group_sources', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), borderRadius: '50%', width: 50, height: 50 } },

  // Group: Platform Engine & Safety Gates
  { id: 'group_core', type: 'universalGroup', data: { label: 'Platform Engine & Safety Gates' }, position: { x: 360, y: 0 }, style: { width: 340, height: 500, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' } },
  { id: 'Linter', data: { label: '🛡️ Pre-PR Linter' }, position: { x: 40, y: 50 }, parentId: 'group_core', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('rose'), borderRadius: '24px', width: 260, height: 50 } },
  { id: 'API', data: { label: 'FastAPI Backend' }, position: { x: 40, y: 160 }, parentId: 'group_core', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('purple'), borderRadius: '24px', width: 260, height: 70 } },
  { id: 'Celery', data: { label: '⚙️ Celery & Redis' }, position: { x: 40, y: 280 }, parentId: 'group_core', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('purple'), borderRadius: '24px', width: 260, height: 70 } },
  { id: 'AtomicDB', data: { label: '🔒 Atomic Registry' }, position: { x: 40, y: 400 }, parentId: 'group_core', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('rose'), borderRadius: '30px 30px 10px 10px', width: 260, height: 60 } },

  // Group: AI Agent Fleet
  { id: 'group_agents', type: 'universalGroup', data: { label: 'AI Agent Fleet' }, position: { x: 820, y: 50 }, style: { width: 280, height: 450, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' } },
  { id: 'Rollup', data: { label: 'Rollup Agent', inlineIcon: '/assets/agents/rollup.svg' }, position: { x: 35, y: 40 }, parentId: 'group_agents', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('emerald'), borderRadius: '999px', width: 210, height: 64 } },
  { id: 'Compiler', data: { label: 'Compiler Agent', inlineIcon: '/assets/agents/compiler.svg' }, position: { x: 35, y: 140 }, parentId: 'group_agents', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('emerald'), borderRadius: '999px', width: 210, height: 64 } },
  { id: 'Gatekeeper', data: { label: 'Gatekeeper Agent', inlineIcon: '/assets/agents/gatekeeper.svg' }, position: { x: 35, y: 240 }, parentId: 'group_agents', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('emerald'), borderRadius: '999px', width: 210, height: 64 } },
  { id: 'Ingestor', data: { label: 'Ingestor Agent', inlineIcon: '/assets/agents/ingestor.svg' }, position: { x: 35, y: 340 }, parentId: 'group_agents', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('emerald'), borderRadius: '999px', width: 210, height: 64 } },

  // Group: LLM Routing Layer
  { id: 'group_llm', type: 'universalGroup', data: { label: 'LLM Routing (Google GenAI SDK)' }, position: { x: 1180, y: 70 }, style: { width: 440, height: 350, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' } },
  { id: 'Router', data: { label: 'AI Router' }, position: { x: 30, y: 110 }, parentId: 'group_llm', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('cyan'), borderRadius: '50%', width: 130, height: 130 } },
  { id: 'Gemini', data: { label: '✨ Gemini Flash 3.5/3.7', googleServiceIcon: '/assets/google/Google_Gemini.webp' }, position: { x: 210, y: 60 }, parentId: 'group_llm', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('rose'), width: 200, height: 50, borderRadius: '24px' } },
  { id: 'Gemma', data: { label: '🦙 Gemma 3/4', googleServiceIcon: '/assets/google/google.png' }, position: { x: 210, y: 220 }, parentId: 'group_llm', extent: 'parent', ...defaultNodeConfig, style: { ...getBadgeStyle('amber'), width: 200, height: 50, borderRadius: '24px' } },

  // Group: Google Cloud Services (Foundation Layer)
  { id: 'group_gcp', type: 'universalGroup', data: { label: 'Google Cloud Services (Foundation Layer)' }, position: { x: -200, y: 700 }, style: { width: 1520, height: 160, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' } },
  { id: 'CloudRun', data: { label: 'Web UI & API (Run)', googleServiceIcon: '/assets/google/cloudrun.png' }, position: { x: 50, y: 50 }, parentId: 'group_gcp', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('cyan'), width: 220, height: 70, borderRadius: '24px' } },
  { id: 'PubSub', data: { label: 'Cloud Pub/Sub', googleServiceIcon: '/assets/google/google.png' }, position: { x: 300, y: 50 }, parentId: 'group_gcp', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('cyan'), width: 240, height: 70, borderRadius: '24px' } },
  { id: 'CloudSQL', data: { label: 'PostgreSQL (Cloud SQL)', googleServiceIcon: '/assets/google/cloudsql.png' }, position: { x: 560, y: 50 }, parentId: 'group_gcp', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('cyan'), width: 240, height: 70, borderRadius: '30px 30px 10px 10px' } },
  { id: 'GCS', data: { label: 'Raw Archives (GCS)', googleServiceIcon: '/assets/google/google.png' }, position: { x: 1020, y: 50 }, parentId: 'group_gcp', extent: 'parent', ...defaultNodeConfig, style: { ...getGlassCardStyle('cyan'), width: 240, height: 70, borderRadius: '30px 30px 10px 10px' } },
];

const defaultEdgeOptions = {
  type: 'draggable',
  style: { stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255, 255, 255, 0.2)' },
};

const initialEdges: Edge[] = [
  // User -> Auth -> CloudRun
  { id: 'eUser-Auth', source: 'User', sourceHandle: 's-bottom', target: 'Auth', targetHandle: 't-top', label: 'Login', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },
  { id: 'eAuth-CloudRun', source: 'Auth', sourceHandle: 's-bottom', target: 'CloudRun', targetHandle: 't-top', label: 'Dashboard Access', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },

  // Data Sources -> PubSub (Webhooks)
  { id: 'eGH-PubSub', source: 'GH', sourceHandle: 's-bottom', target: 'PubSub', targetHandle: 't-left', label: 'Webhooks', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },
  { id: 'eJira-API', source: 'Jira', sourceHandle: 's-right', target: 'API', targetHandle: 't-left', label: 'Webhooks', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },


  // PubSub -> API
  { id: 'ePubSub-API', source: 'PubSub', sourceHandle: 's-top', target: 'API', targetHandle: 't-bottom', label: 'Event Stream', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },

  // API -> Celery
  { id: 'eAPI-Celery', source: 'API', sourceHandle: 's-bottom', target: 'Celery', targetHandle: 't-top', label: 'Schedule Tasks', ...defaultEdgeOptions, animated: true, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },

  // Celery -> Scheduled Polls
  { id: 'eCelery-Conf', source: 'Celery', sourceHandle: 's-left', target: 'Conf', targetHandle: 't-right', label: 'Poll', ...defaultEdgeOptions, animated: true, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },
  { id: 'eCelery-Notion', source: 'Celery', sourceHandle: 's-left', target: 'Notion', targetHandle: 't-right', label: 'Poll', ...defaultEdgeOptions, animated: true, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },
  { id: 'eCelery-Slack', source: 'Celery', sourceHandle: 's-left', target: 'Slack', targetHandle: 't-right', label: 'Batch (Optional)', ...defaultEdgeOptions, animated: true, style: { stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255, 255, 255, 0.15)' } },

  // Celery -> Agents
  { id: 'eCelery-Ingestor', source: 'Celery', sourceHandle: 's-right', target: 'Ingestor', targetHandle: 't-left', ...defaultEdgeOptions, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },
  { id: 'eCelery-Gatekeeper', source: 'Celery', sourceHandle: 's-right', target: 'Gatekeeper', targetHandle: 't-left', label: 'EVALUATE DIFF', ...defaultEdgeOptions, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },
  { id: 'eCelery-Rollup', source: 'Celery', sourceHandle: 's-right', target: 'Rollup', targetHandle: 't-left', label: 'ORG MAP SYNTHESIS', ...defaultEdgeOptions, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },
  { id: 'eCelery-Compiler', source: 'Celery', sourceHandle: 's-right', target: 'Compiler', targetHandle: 't-left', label: 'SYNTHESIZE KB', ...defaultEdgeOptions, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },

  // Agent Orchestration (Intra-Fleet)
  { id: 'eIngestor-Compiler', source: 'Ingestor', sourceHandle: 's-top', target: 'Compiler', targetHandle: 't-bottom', label: 'PARSED CONTEXT', type: 'draggable', animated: true, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },
  { id: 'eGatekeeper-Compiler', source: 'Gatekeeper', sourceHandle: 's-top', target: 'Compiler', targetHandle: 't-bottom', label: 'PATCH INSTRUCTIONS', type: 'draggable', animated: true, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },
  { id: 'eCompiler-Rollup', source: 'Compiler', sourceHandle: 's-top', target: 'Rollup', targetHandle: 't-bottom', label: 'APP KBs', type: 'draggable', animated: true, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },

  // Agents -> Router
  { id: 'eIngestor-Router', source: 'Ingestor', sourceHandle: 's-right', target: 'Router', targetHandle: 't-left', label: 'Map/Reduce', ...defaultEdgeOptions, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },
  { id: 'eGatekeeper-Router', source: 'Gatekeeper', sourceHandle: 's-right', target: 'Router', targetHandle: 't-left', label: 'Evaluate Diff', ...defaultEdgeOptions, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },
  { id: 'eCompiler-Router', source: 'Compiler', sourceHandle: 's-right', target: 'Router', targetHandle: 't-left', label: 'Synthesize KB', ...defaultEdgeOptions, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },
  { id: 'eRollup-Router', source: 'Rollup', sourceHandle: 's-right', target: 'Router', targetHandle: 't-left', label: 'Org Map Synthesis', ...defaultEdgeOptions, style: { stroke: THEME.colors.emerald, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.emerald } },

  // Router -> LLMs
  { id: 'eRouter-Gemini', source: 'Router', sourceHandle: 's-right', target: 'Gemini', targetHandle: 't-left', label: 'Remote / Hybrid', ...defaultEdgeOptions, animated: true, style: { stroke: THEME.colors.rose, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.rose } },
  { id: 'eRouter-Gemma', source: 'Router', sourceHandle: 's-right', target: 'Gemma', targetHandle: 't-left', label: 'Local / Hybrid', ...defaultEdgeOptions, animated: true, style: { stroke: THEME.colors.amber, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.amber } },

  // Backwards Edges (Agents -> Safety Gates)
  { id: 'eIngestor-AtomicDB', source: 'Ingestor', sourceHandle: 's-left', target: 'AtomicDB', targetHandle: 't-right', label: '1a. Check/Reserve Slugs', ...defaultEdgeOptions, style: { stroke: THEME.colors.rose, strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.rose } },
  { id: 'eCompiler-Linter', source: 'Compiler', sourceHandle: 's-left', target: 'Linter', targetHandle: 't-right', label: '3a. Validate Format', ...defaultEdgeOptions, style: { stroke: THEME.colors.rose, strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.rose } },

  // Linter -> GitHub (HITL)
  { id: 'eLinter-GH', source: 'Linter', sourceHandle: 's-left', target: 'GH', targetHandle: 't-right', label: '[HITL] Human Approval Required', ...defaultEdgeOptions, style: { stroke: THEME.colors.rose, strokeWidth: 3, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.rose } },

  // Services & Storage
  { id: 'eIngestor-GCS', source: 'Ingestor', sourceHandle: 's-bottom', target: 'GCS', targetHandle: 't-top', label: 'Save Snapshot', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },
  { id: 'eCloudRun-API', source: 'CloudRun', sourceHandle: 's-top', target: 'API', targetHandle: 't-left', label: 'Hosts', ...defaultEdgeOptions, style: { stroke: THEME.colors.cyan, strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.cyan } },
  { id: 'eAPI-CloudSQL', source: 'API', sourceHandle: 's-right', target: 'CloudSQL', targetHandle: 't-top', label: 'Reads/Writes', ...defaultEdgeOptions, style: { stroke: THEME.colors.neonPurple, strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: THEME.colors.neonPurple } },
];

export default function ArchitectureDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [mounted, setMounted] = useState(false);

  const nodeTypes = useMemo(() => ({ universal: UniversalNode, universalGroup: UniversalGroupNode }), []);
  const edgeTypes = useMemo(() => ({ draggable: DraggableEdge }), []);

  useEffect(() => {
    const savedNodes = localStorage.getItem('astrophage-diagram-nodes-v18');
    const savedEdges = localStorage.getItem('astrophage-diagram-edges-v18');
    if (savedNodes && savedEdges) {
      try {
        const loadedNodes = JSON.parse(savedNodes);
        const upgradedNodes = loadedNodes.map((n: Node) => ({
          ...n,
          type: (n.type === 'group' || n.id.startsWith('group_')) ? 'universalGroup' : 'universal'
        }));
        setNodes(upgradedNodes);
        setEdges(JSON.parse(savedEdges));
      } catch (e) {
        console.error("Failed to parse saved diagram", e);
      }
    }
    setMounted(true);
  }, [setNodes, setEdges]);

  const handleSave = () => {
    localStorage.setItem('astrophage-diagram-nodes-v18', JSON.stringify(nodes));
    localStorage.setItem('astrophage-diagram-edges-v18', JSON.stringify(edges));
    alert('Diagram saved locally! It will restore when you refresh.');
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [setEdges]
  );

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    if (params.nodes.length > 0) {
      setSelectedNode(params.nodes[0]);
      setSelectedEdge(null);
    } else if (params.edges.length > 0) {
      setSelectedEdge(params.edges[0]);
      setSelectedNode(null);
    } else {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, []);

  const updateSelectedNodeStyle = (key: string, value: string | number) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = { ...n, style: { ...n.style, [key]: value } };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return n;
      })
    );
  };

  const applyThemeStyle = (baseType: 'badge' | 'glass', colorPreset: keyof typeof THEME_PRESETS) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const newBaseStyle = baseType === 'badge' ? getBadgeStyle(colorPreset) : getGlassCardStyle(colorPreset);
          const updatedNode = {
            ...n,
            style: {
              ...n.style, // Preserve width/height/border-radius
              ...newBaseStyle,
              width: n.style?.width,
              height: n.style?.height,
              borderRadius: n.style?.borderRadius,
            }
          };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return n;
      })
    );
  };

  const updateSelectedEdge = (key: string, value: any) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          const updatedEdge = { ...e, [key]: value };
          setSelectedEdge(updatedEdge);
          return updatedEdge;
        }
        return e;
      })
    );
  };

  const updateSelectedEdgeStyle = (key: string, value: any) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          const updatedEdge = { ...e, style: { ...(e.style || {}), [key]: value } };
          setSelectedEdge(updatedEdge);
          return updatedEdge;
        }
        return e;
      })
    );
  };

  const updateSelectedEdgeColor = (colorHex: string) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          const updatedEdge = {
            ...e,
            style: { ...(e.style || {}), stroke: colorHex },
            markerEnd: { type: MarkerType.ArrowClosed, color: colorHex }
          };
          setSelectedEdge(updatedEdge);
          return updatedEdge;
        }
        return e;
      })
    );
  };

  if (!mounted) return <div className="w-full h-screen bg-[#070B19]" />; // Prevent SSR mismatch

  return (
    <div className="w-full h-screen relative overflow-hidden flex" style={{ backgroundColor: THEME.colors.bgDark }}>

      {/* Background Recreation */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 110%, #0a1329 0%, #070B19 70%, #040711 100%)', zIndex: 0 }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.65, zIndex: 0,
        backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '70px 70px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 20%, transparent 80%)',
      }} />

      <div className="absolute top-6 left-6 z-10 text-white font-sans pointer-events-none flex flex-col items-start gap-4">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #00D2FF 0%, #6366F1 50%, #B026FF 100%)' }}>
            Project Astrophage
          </h1>
          <p className="text-sm mt-2" style={{ color: THEME.colors.textSecondary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            System Architecture & Integrations
          </p>
        </div>
      </div>



      <div className="flex-1 relative z-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onSelectionChange={handleSelectionChange}
          fitView
          className="dark"
          minZoom={0.2}
        >
          <MiniMap
            nodeColor={(node) => node.type === 'group' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)'}
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{ backgroundColor: THEME.colors.bgDark, border: `1px solid ${THEME.colors.borderSubtle}`, borderRadius: '12px' }}
          />
          <Controls style={{ backgroundColor: THEME.colors.bgCard, color: 'white', fill: 'white', border: `1px solid ${THEME.colors.borderSubtle}`, borderRadius: '8px' }} />
        </ReactFlow>

        <div className="absolute bottom-6 right-6 z-50">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500/30 hover:scale-105 transition-all font-bold uppercase text-sm tracking-wider cursor-pointer flex items-center gap-2 backdrop-blur-md"
          >
            <span className="text-lg">💾</span> Save Diagram
          </button>
        </div>
      </div>

      {/* Configuration Sidebar */}
      {(selectedNode || selectedEdge) && (
        <div className="w-80 h-full relative z-20 border-l p-6 font-sans overflow-y-auto" style={{ backgroundColor: THEME.colors.bgDarker, borderColor: THEME.colors.borderSubtle }}>
          <h2 className="text-white text-xl font-bold mb-6">Customize {selectedNode ? (selectedNode.type === 'group' ? 'Box / Group' : 'Node') : 'Line / Edge'}</h2>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Selected Object</label>
            <div className="text-white bg-white/5 p-3 rounded border border-white/10 break-words">
              {selectedNode ? (selectedNode.data?.label as string || selectedNode.id) : (selectedEdge?.label as string || selectedEdge?.id)}
            </div>
          </div>

          {/* NODE CUSTOMIZATIONS */}
          {selectedNode && (
            <>
              {/* Sizing Controls */}
              <div className="mb-6 space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Dimensions</label>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Width</span>
                    <span>{selectedNode.style?.width || 0}px</span>
                  </div>
                  <input
                    type="range" min="50" max="600" step="10"
                    value={(selectedNode.style?.width as number) || 100}
                    onChange={(e) => updateSelectedNodeStyle('width', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Height</span>
                    <span>{selectedNode.style?.height || 0}px</span>
                  </div>
                  <input
                    type="range" min="30" max="800" step="10"
                    value={(selectedNode.style?.height as number) || 50}
                    onChange={(e) => updateSelectedNodeStyle('height', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              {/* Shape / Border Radius */}
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Shape (Border Radius)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => updateSelectedNodeStyle('borderRadius', '8px')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Rectangle</button>
                  <button onClick={() => updateSelectedNodeStyle('borderRadius', '24px')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded-xl">Rounded</button>
                  <button onClick={() => updateSelectedNodeStyle('borderRadius', '999px')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded-full">Pill</button>
                  <button onClick={() => { updateSelectedNodeStyle('borderRadius', '50%'); updateSelectedNodeStyle('width', selectedNode.style?.width || 100); updateSelectedNodeStyle('height', selectedNode.style?.width || 100); }} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded-[50%]">Circle</button>
                </div>
              </div>

              {/* Render Style for regular nodes */}
              {selectedNode.type !== 'group' && (
                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Render Style</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button onClick={() => applyThemeStyle('badge', 'cyan')} className="px-3 py-2 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 rounded">Badge Theme</button>
                    <button onClick={() => applyThemeStyle('glass', 'cyan')} className="px-3 py-2 text-sm bg-slate-800 text-white border border-cyan-500/40 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:bg-slate-700 rounded">Glass Theme</button>
                  </div>

                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Color Glow</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map((color) => (
                      <button
                        key={color}
                        onClick={() => applyThemeStyle(
                          ((selectedNode.style?.background as string) || '').includes('linear-gradient') ? 'glass' : 'badge',
                          color
                        )}
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: THEME_PRESETS[color].hex, boxShadow: `0 0 10px ${THEME_PRESETS[color].hex}` }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Box Background for Group nodes */}
              {selectedNode.type === 'group' && (
                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Box Background Opacity</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button onClick={() => updateSelectedNodeStyle('backgroundColor', 'rgba(255, 255, 255, 0)')} className="px-3 py-2 text-xs bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">None</button>
                    <button onClick={() => updateSelectedNodeStyle('backgroundColor', 'rgba(255, 255, 255, 0.02)')} className="px-3 py-2 text-xs bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Low</button>
                    <button onClick={() => updateSelectedNodeStyle('backgroundColor', 'rgba(255, 255, 255, 0.08)')} className="px-3 py-2 text-xs bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Medium</button>
                  </div>

                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Box Border Color</label>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateSelectedNodeStyle('border', '1px dashed rgba(255, 255, 255, 0.2)')} className="px-3 py-1 text-xs bg-white/5 text-white border border-white/20 border-dashed rounded">Dashed</button>
                    <button onClick={() => updateSelectedNodeStyle('border', '1px solid rgba(255, 255, 255, 0.05)')} className="px-3 py-1 text-xs bg-white/5 text-white border border-white/10 rounded">Solid</button>
                    {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map((color) => (
                      <button
                        key={color}
                        onClick={() => updateSelectedNodeStyle('border', `1px solid ${THEME_PRESETS[color].hex}`)}
                        className="w-6 h-6 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: THEME_PRESETS[color].hex }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* EDGE CUSTOMIZATIONS */}
          {selectedEdge && (
            <>
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Line Path Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => updateSelectedEdge('type', 'draggable')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Draggable Step</button>
                  <button onClick={() => updateSelectedEdge('type', 'step')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Sharp Step</button>
                  <button onClick={() => updateSelectedEdge('type', 'bezier')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Bezier (Curve)</button>
                  <button onClick={() => updateSelectedEdge('type', 'straight')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Straight Line</button>
                </div>
              </div>

              {selectedEdge.type === 'smoothstep' && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                    <span>Turn Radius (Smoothstep)</span>
                    <span>{selectedEdge.style?.borderRadius ?? 5}px</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={(selectedEdge.style?.borderRadius as number) ?? 5}
                    onChange={(e) => updateSelectedEdgeStyle('borderRadius', parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Line Style</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => updateSelectedEdgeStyle('strokeDasharray', 'none')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded">Solid</button>
                  <button onClick={() => updateSelectedEdgeStyle('strokeDasharray', '5,5')} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded border-dashed">Dashed</button>
                  <button onClick={() => updateSelectedEdgeStyle('strokeWidth', 1)} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded font-light">Thin (1px)</button>
                  <button onClick={() => updateSelectedEdgeStyle('strokeWidth', 3)} className="px-3 py-2 text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded font-bold">Thick (3px)</button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="animated-toggle"
                    checked={selectedEdge.animated || false}
                    onChange={(e) => updateSelectedEdge('animated', e.target.checked)}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <label htmlFor="animated-toggle" className="text-sm text-white">Animated (Flowing)</label>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Line Color</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateSelectedEdgeColor('rgba(255, 255, 255, 0.2)')} className="w-8 h-8 rounded-full border-2 border-white/20 bg-gray-500" title="Subtle Gray" />
                  {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map((color) => (
                    <button
                      key={color}
                      onClick={() => updateSelectedEdgeColor(THEME_PRESETS[color].hex)}
                      className="w-8 h-8 rounded-full border-2 border-white/20"
                      style={{ backgroundColor: THEME_PRESETS[color].hex }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .react-flow__node-group {
            color: rgba(255,255,255,0.4);
            font-size: 13px;
            font-weight: 700;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 15px;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-family: system-ui, sans-serif;
            pointer-events: all;
        }
        .react-flow__edge-textbg {
            fill: #0B1120;
            rx: 4px;
            ry: 4px;
        }
        .react-flow__edge-text {
            fill: #94A3B8;
            font-size: 10px;
            font-weight: 700;
            font-family: system-ui, sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        /* Make handles visible on hover or selection so edges can be reconnected */
        .react-flow__handle {
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            width: 12px;
            height: 12px;
            border: 2px solid rgba(0, 210, 255, 0.8);
            background-color: #070B19;
        }
        .react-flow__node:hover .react-flow__handle,
        .react-flow__node.selected .react-flow__handle {
            opacity: 1;
        }
        .react-flow__handle:hover {
            transform: scale(1.5);
            background-color: #00D2FF;
        }
        .react-flow__node.selected, .react-flow__node-group.selected {
            outline: 2px solid #fff;
            outline-offset: 4px;
            z-index: 100;
        }
        .react-flow__edge .edge-interaction-group { opacity: 0; transition: opacity 0.2s; }
        .react-flow__edge:hover .edge-interaction-group, .react-flow__edge.selected .edge-interaction-group { opacity: 1; }
        .react-flow__edge.selected .react-flow__edge-path {
            stroke-width: 4 !important;
            filter: drop-shadow(0 0 4px rgba(255,255,255,0.8));
        }
      `}} />
    </div>
  );
}
