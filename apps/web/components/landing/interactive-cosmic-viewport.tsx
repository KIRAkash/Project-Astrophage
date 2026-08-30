'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, Zap, Shield, Activity, Layers, Orbit } from 'lucide-react';

interface KBNode {
  id: string;
  name: string;
  category: string;
  color: string;
  glowColor: string;
  x: number; // percentage in 3D plane
  y: number;
  sources: string[];
  metrics: { astNodes: string; latency: string; contracts: string; status: string };
  description: string;
}

const KB_NODES: KBNode[] = [
  {
    id: 'matching',
    name: 'Order Matching KB',
    category: 'CORE ENGINE',
    color: '#00D2FF',
    glowColor: 'rgba(0, 210, 255, 0.6)',
    x: 18,
    y: 48,
    sources: ['GitHub', 'Confluence', 'Jira'],
    metrics: { astNodes: '48.2k', latency: '4ms', contracts: '128', status: 'SYNCHRONIZED' },
    description: 'High-throughput matching engine AST lineage and order book schemas.',
  },
  {
    id: 'auth',
    name: 'Auth & Policy KB',
    category: 'SECURITY MESH',
    color: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.6)',
    x: 48,
    y: 18,
    sources: ['GitHub', 'Slack', 'Notion'],
    metrics: { astNodes: '22.8k', latency: '2ms', contracts: '64', status: 'VERIFIED' },
    description: 'Zero-trust token verification, IAM roles, and access control policies.',
  },
  {
    id: 'gateway',
    name: 'Market Gateway KB',
    category: 'EDGE ROUTING',
    color: '#B026FF',
    glowColor: 'rgba(176, 38, 255, 0.6)',
    x: 80,
    y: 45,
    sources: ['GitHub', 'Notion', 'Slack'],
    metrics: { astNodes: '64.1k', latency: '6ms', contracts: '312', status: 'ACTIVE' },
    description: 'Edge endpoint routing, rate limit contracts, and public API interfaces.',
  },
  {
    id: 'settlement',
    name: 'Settlement KB',
    category: 'LEDGER FABRIC',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    x: 52,
    y: 80,
    sources: ['GitHub', 'Notion', 'Jira'],
    metrics: { astNodes: '39.5k', latency: '5ms', contracts: '92', status: 'FINALIZED' },
    description: 'Event-driven ledger contracts, multi-party reconciliation, and auditing.',
  },
];

export function InteractiveCosmicViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeNode, setActiveNode] = useState<KBNode | null>(KB_NODES[0]);
  const [activeTab, setActiveTab] = useState<'all' | 'mesh' | 'lineage'>('all');

  // Mouse Parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 25, stiffness: 120 });
  const smoothMouseY = useSpring(mouseY, { damping: 25, stiffness: 120 });

  // Scroll Choreography
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // 3D Perspective Transformations based on scroll
  const tiltX = useTransform(scrollYProgress, [0, 0.5, 1], [24, 48, 30]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.5, 1], [-4, 8, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1.05, 1]);
  const planeSeparation = useTransform(scrollYProgress, [0, 0.5, 1], [40, 160, 120]);
  const laserOpacity = useTransform(scrollYProgress, [0, 0.25, 0.8], [0.3, 1, 0.85]);

  const smoothTiltX = useSpring(tiltX, { damping: 20, stiffness: 80 });
  const smoothRotateZ = useSpring(rotateZ, { damping: 20, stiffness: 80 });
  const smoothScale = useSpring(scale, { damping: 20, stiffness: 80 });

  // Handle Mouse movement for interactive 3D tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x * 16);
    mouseY.set(y * 16);
  };

  // Background Starfield & Volumetric particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    // Particle nodes for background cosmic dust
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.6 ? '#00D2FF' : Math.random() > 0.3 ? '#B026FF' : '#38BDF8',
    }));

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Render cosmic particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.8 + Math.sin(frame * 0.05 + p.x) * 0.2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-[160vh] bg-[#040711] text-white select-none overflow-visible"
    >
      {/* Sticky Stage Container */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Background Particle Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-70 z-0"
        />

        {/* Ambient Volumetric Nebula Backdrops */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[650px] h-[650px] bg-neonPurple/15 rounded-full blur-[170px] pointer-events-none" />

        {/* Top Floating Control Bar */}
        <div className="absolute top-24 z-30 flex flex-wrap items-center justify-between w-full max-w-7xl px-6 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-cyan/30 backdrop-blur-xl shadow-[0_0_20px_rgba(0,210,255,0.2)]">
              <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_#00D2FF] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">
                OPENKB 3D MESH VIEWER
              </span>
            </div>
            <span className="hidden sm:inline-block text-xs font-mono text-zinc-400">
              Scroll to expand dual-plane &bull; Click nodes for telemetry
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl mt-3 sm:mt-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === 'all'
                  ? 'bg-cyan text-black font-bold shadow-[0_0_12px_rgba(0,210,255,0.6)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Dual Plane
            </button>
            <button
              onClick={() => setActiveTab('mesh')}
              className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === 'mesh'
                  ? 'bg-cyan text-black font-bold shadow-[0_0_12px_rgba(0,210,255,0.6)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mesh Only
            </button>
            <button
              onClick={() => setActiveTab('lineage')}
              className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === 'lineage'
                  ? 'bg-cyan text-black font-bold shadow-[0_0_12px_rgba(0,210,255,0.6)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Live Lineage
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 3D TRANSFORMED COSMIC UNIVERSE STAGE                                 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          style={{
            perspective: 1200,
            scale: smoothScale,
          }}
          className="relative w-full max-w-6xl aspect-[16/10] flex items-center justify-center pointer-events-none mt-12"
        >
          {/* 3D Tilting Stage Plane */}
          <motion.div
            style={{
              rotateX: smoothTiltX,
              rotateZ: smoothRotateZ,
              x: smoothMouseX,
              y: smoothMouseY,
              transformStyle: 'preserve-3d',
            }}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* ── LOWER PLANE: Application Fleet Substrate (drops down on scroll) ── */}
            {activeTab !== 'mesh' && (
              <motion.div
                style={{
                  translateZ: useTransform(planeSeparation, (val) => -val),
                  opacity: useTransform(scrollYProgress, [0, 0.4], [0.35, 0.85]),
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {/* Lower Fleet Grid Mesh */}
                <div className="absolute inset-12 border border-white/5 rounded-full bg-gradient-to-b from-transparent via-cyan/[0.02] to-transparent shadow-[inset_0_0_80px_rgba(0,210,255,0.05)]" />

                {/* Lower Elliptical Orbit Rings */}
                <svg className="absolute inset-0 w-full h-full overflow-visible">
                  <ellipse
                    cx="50%"
                    cy="50%"
                    rx="46%"
                    ry="28%"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                    fill="none"
                  />
                  <ellipse
                    cx="50%"
                    cy="50%"
                    rx="30%"
                    ry="18%"
                    stroke="rgba(0,210,255,0.12)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </svg>

                {/* Lower Fleet Application Nodes */}
                {[
                  { name: 'order-matching.git', x: '20%', y: '50%', color: '#00D2FF' },
                  { name: 'auth-service.git', x: '50%', y: '22%', color: '#F43F5E' },
                  { name: 'market-gateway.git', x: '80%', y: '48%', color: '#B026FF' },
                  { name: 'settlement-engine.git', x: '50%', y: '78%', color: '#10B981' },
                ].map((node) => (
                  <div
                    key={node.name}
                    style={{ left: node.x, top: node.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#070B19]/90 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: node.color, boxShadow: `0 0 8px ${node.color}` }}
                    />
                    <span className="font-mono text-[11px] text-zinc-300 font-semibold tracking-wide">
                      {node.name}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── VERTICAL UPDRAFT CONDUITS (Connecting Lower to Upper) ──────── */}
            {activeTab !== 'mesh' && (
              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                <defs>
                  <linearGradient id="updraftCyan" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="60%" stopColor="#00D2FF" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                {/* Vertical Updraft Laser Beams */}
                <line x1="20%" y1="50%" x2="20%" y2="50%" stroke="url(#updraftCyan)" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                <line x1="50%" y1="22%" x2="50%" y2="22%" stroke="url(#updraftCyan)" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                <line x1="80%" y1="48%" x2="80%" y2="48%" stroke="url(#updraftCyan)" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                <line x1="50%" y1="78%" x2="50%" y2="78%" stroke="url(#updraftCyan)" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
              </svg>
            )}

            {/* ── UPPER PLANE: OpenKB Fabric (Elevates upward on scroll) ─────── */}
            <motion.div
              style={{
                translateZ: planeSeparation,
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-auto"
            >
              {/* Upper Knowledge Mesh SVG Laser Highways */}
              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                <defs>
                  <linearGradient id="highwayMatchGate" x1="18%" y1="48%" x2="80%" y2="45%">
                    <stop offset="0%" stopColor="#00D2FF" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#B026FF" />
                  </linearGradient>
                  <linearGradient id="highwayGateSettle" x1="80%" y1="45%" x2="52%" y2="80%">
                    <stop offset="0%" stopColor="#B026FF" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <linearGradient id="highwayAuthMatch" x1="48%" y1="18%" x2="18%" y2="48%">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#00D2FF" />
                  </linearGradient>
                </defs>

                {/* Laser Highways between KBs */}
                <g opacity={1}>
                  {/* Matching KB <-> Gateway KB */}
                  <line
                    x1="18%"
                    y1="48%"
                    x2="80%"
                    y2="45%"
                    stroke="url(#highwayMatchGate)"
                    strokeWidth="3"
                    strokeDasharray="12 8"
                    className="animate-pulse"
                  />
                  {/* Gateway KB <-> Settlement KB */}
                  <line
                    x1="80%"
                    y1="45%"
                    x2="52%"
                    y2="80%"
                    stroke="url(#highwayGateSettle)"
                    strokeWidth="2.5"
                    strokeDasharray="10 6"
                  />
                  {/* Auth KB <-> Matching KB */}
                  <line
                    x1="48%"
                    y1="18%"
                    x2="18%"
                    y2="48%"
                    stroke="url(#highwayAuthMatch)"
                    strokeWidth="2.5"
                    strokeDasharray="10 6"
                  />
                  {/* Radial Lines from Core to KBs */}
                  <line x1="50%" y1="50%" x2="18%" y2="48%" stroke="#00D2FF" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
                  <line x1="50%" y1="50%" x2="48%" y2="18%" stroke="#F43F5E" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
                  <line x1="50%" y1="50%" x2="80%" y2="45%" stroke="#B026FF" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
                  <line x1="50%" y1="50%" x2="52%" y2="80%" stroke="#10B981" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
                </g>

                {/* Upper Orbit Concentric Guides */}
                <ellipse cx="50%" cy="50%" rx="44%" ry="26%" stroke="rgba(0,210,255,0.3)" strokeWidth="1.5" strokeDasharray="8 8" fill="none" />
                <ellipse cx="50%" cy="50%" rx="28%" ry="16%" stroke="rgba(176,38,255,0.3)" strokeWidth="1.5" strokeDasharray="6 6" fill="none" />
              </svg>

              {/* ── ASTROPHAGE SINGULARITY CORE (CENTER SUN) ─────────────── */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-auto cursor-pointer group">
                {/* Relativistic Accretion Aura */}
                <div className="absolute -inset-16 rounded-full bg-gradient-to-tr from-[#00D2FF]/40 via-[#6366F1]/30 to-[#B026FF]/30 blur-[45px] group-hover:scale-110 transition-transform duration-700 pointer-events-none" />

                {/* Spinning Relativistic Accretion Rings */}
                <div
                  className="absolute -inset-6 rounded-full border-2 border-dashed border-cyan/60"
                  style={{ animation: 'orbit-spin 16s linear infinite' }}
                />
                <div
                  className="absolute -inset-12 rounded-full border border-dashed border-neonPurple/50"
                  style={{ animation: 'orbit-spin 24s linear infinite reverse' }}
                />

                {/* Obsidian Core Sphere with Glowing Rim */}
                <div className="relative w-28 h-28 rounded-full bg-[#040711] border-2 border-cyan shadow-[0_0_50px_rgba(0,210,255,0.7)] flex flex-col items-center justify-center p-3 group-hover:shadow-[0_0_80px_rgba(0,210,255,0.9)] transition-shadow">
                  <Image
                    src="/assets/logos/logo.svg"
                    alt="Astrophage Core"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,210,255,0.9)]"
                  />
                </div>
              </div>

              {/* ── 4 RADIANT KNOWLEDGE BASE NODES ───────────────────────── */}
              {KB_NODES.map((kb) => {
                const isSelected = activeNode?.id === kb.id;
                return (
                  <div
                    key={kb.id}
                    style={{ left: `${kb.x}%`, top: `${kb.y}%` }}
                    onClick={() => setActiveNode(kb)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer pointer-events-auto group"
                  >
                    {/* Atmospheric Glow on Hover / Selection */}
                    <div
                      style={{
                        backgroundColor: kb.glowColor,
                        opacity: isSelected ? 0.9 : 0.4,
                      }}
                      className="absolute -inset-6 rounded-full blur-xl transition-all duration-300 group-hover:opacity-100 group-hover:scale-125"
                    />

                    {/* Node Badge Card */}
                    <div
                      style={{
                        borderColor: isSelected ? kb.color : 'rgba(255,255,255,0.15)',
                        boxShadow: isSelected ? `0 0 35px ${kb.color}88, 0 10px 30px rgba(0,0,0,0.9)` : '0 10px 30px rgba(0,0,0,0.7)',
                      }}
                      className="relative px-4 py-3 rounded-2xl bg-[#070B19]/95 backdrop-blur-2xl border transition-all duration-300 flex items-center gap-3 group-hover:scale-105"
                    >
                      <div
                        style={{ backgroundColor: kb.color, boxShadow: `0 0 14px ${kb.color}` }}
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse"
                      />
                      <div className="flex flex-col">
                        <span className="font-space font-extrabold text-white text-xs sm:text-sm whitespace-nowrap tracking-wide">
                          {kb.name}
                        </span>
                        <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                          {kb.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* BOTTOM TELEMETRY INSPECTOR HUD (REAL-TIME SPEC READOUT)              */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeNode && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            key={activeNode.id}
            transition={{ duration: 0.4 }}
            className="absolute bottom-8 z-40 w-full max-w-5xl px-6 pointer-events-auto"
          >
            <div className="glass-card-deep p-5 sm:p-6 rounded-2xl border border-cyan/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Details */}
              <div className="space-y-1.5 max-w-lg">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activeNode.color, boxShadow: `0 0 8px ${activeNode.color}` }}
                  />
                  <h4 className="font-space font-extrabold text-white text-base sm:text-lg">
                    {activeNode.name}
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-cyan">
                    {activeNode.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {activeNode.description}
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-zinc-400">
                  <span className="text-zinc-400">Connected Sources:</span>
                  <span className="text-white font-medium">{activeNode.sources.join(', ')}</span>
                </div>
              </div>

              {/* Right Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-[#040711]/90 p-3 rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">AST Nodes</span>
                  <span className="text-sm font-bold text-white block mt-0.5">{activeNode.metrics.astNodes}</span>
                </div>
                <div className="bg-[#040711]/90 p-3 rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Latency</span>
                  <span className="text-sm font-bold text-cyan block mt-0.5">{activeNode.metrics.latency}</span>
                </div>
                <div className="bg-[#040711]/90 p-3 rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Contracts</span>
                  <span className="text-sm font-bold text-neonPurple block mt-0.5">{activeNode.metrics.contracts}</span>
                </div>
                <div className="bg-[#040711]/90 p-3 rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Status</span>
                  <span className="text-xs font-bold text-emerald block mt-1">{activeNode.metrics.status}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
