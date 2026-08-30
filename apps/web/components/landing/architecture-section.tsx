'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Layers, ArrowUpRight, Cpu, Compass, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export function ArchitectureSection() {
  const reduce = useReducedMotion();

  return (
    <section id="architecture" className="py-32 relative bg-[#070B19] overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-mono tracking-widest uppercase mb-4"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>DUAL-PLANE INTELLIGENCE</span>
          </motion.div>

          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-space"
          >
            The OpenKB Architecture
          </motion.h2>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="text-base sm:text-lg text-zinc-400 mt-4 leading-relaxed"
          >
            Astrophage decouples raw source code repositories from an active, queryable semantic layer. Dedicated Knowledge Bases synthesize truth in real time without human intervention.
          </motion.p>
        </div>

        {/* Dual-Plane Interactive Visualization Card */}
        <div className="glass-card-deep rounded-3xl border border-cyan/30 p-8 lg:p-12 relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          {/* Top Plane: Upper Knowledge Mesh */}
          <div className="border border-cyan/30 rounded-2xl p-6 lg:p-8 bg-cyan/5 relative mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan/20 border border-cyan/50 flex items-center justify-center text-cyan font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-space">
                    Upper Knowledge Plane (OpenKB Fabric)
                  </h3>
                  <p className="text-xs font-mono text-cyan">
                    PERSISTENT SEMANTIC MESH &bull; ASTROPHAGE SINGULARITY CORE
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono bg-cyan/10 border border-cyan/30 text-cyan px-3 py-1 rounded-full self-start sm:self-auto">
                Real-Time Query Routing
              </span>
            </div>

            {/* Knowledge Bases Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: 'Matching KB', color: '#00D2FF', desc: 'Order engine contracts' },
                { name: 'Auth KB', color: '#F43F5E', desc: 'RBAC & token policies' },
                { name: 'Gateway KB', color: '#B026FF', desc: 'Edge routing & endpoints' },
                { name: 'Compliance KB', color: '#F59E0B', desc: 'Audit trails & GDPR rules' },
                { name: 'Settlement KB', color: '#10B981', desc: 'Ledger & transaction flows' },
              ].map((kb) => (
                <div
                  key={kb.name}
                  className="bg-[#070B19]/90 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-cyan/50 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: kb.color, boxShadow: `0 0 8px ${kb.color}` }} />
                    <span className="text-xs font-bold font-mono text-white tracking-wider truncate">
                      {kb.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 leading-tight">
                    {kb.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Updraft Conduits */}
          <div className="flex items-center justify-center gap-8 py-2 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-cyan animate-pulse" />
              <span>AST Parsing</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-neonPurple animate-pulse" />
              <span>PR & Commit Ingestion</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald animate-pulse" />
              <span>Cross-KB Lineage Updraft</span>
            </div>
          </div>

          {/* Bottom Plane: Lower Physical Substrate */}
          <div className="border border-white/10 rounded-2xl p-6 lg:p-8 bg-white/[0.02] relative mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-zinc-300 font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-space">
                    Lower Physical Substrate (Application Fleet)
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    RAW REPOSITORIES &bull; EVENT STREAMS &bull; HUMAN CONVERSATIONS
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono bg-white/5 border border-white/10 text-zinc-400 px-3 py-1 rounded-full self-start sm:self-auto">
                Raw Data Sources
              </span>
            </div>

            {/* Application Services Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: 'Order Matching', sources: ['GitHub', 'Jira', 'Confluence'] },
                { name: 'Auth Service', sources: ['GitHub', 'Slack', 'Notion'] },
                { name: 'Market Gateway', sources: ['GitHub', 'Notion', 'Slack'] },
                { name: 'Compliance Monitor', sources: ['GitHub', 'Jira', 'Confluence'] },
                { name: 'Settlement Service', sources: ['GitHub', 'Notion', 'Jira'] },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="bg-[#040711]/90 border border-white/5 rounded-xl p-4 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-zinc-300 mb-2 truncate">
                    {svc.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                    {svc.sources.join(' / ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center text-cyan flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-space mb-1">Decoupled Micro-KBs</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Each service maintains its own semantic boundary, isolating changes while exposing standardized API contracts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-neonPurple/10 border border-neonPurple/30 text-neonPurple flex-shrink-0 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-space mb-1">Central Astrophage Core</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Coordinates cross-KB queries, resolving global architectural dependencies across monorepos and distributed clusters.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald flex-shrink-0 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-space mb-1">Deterministic Verification</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Answers return with cryptographic source hashes linked to exact git commits and peer-reviewed RFCs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
