'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Terminal, CheckCircle2, ArrowRight, Route, Zap } from 'lucide-react';

const traversalSteps = [
  {
    step: '01',
    actor: 'Agent & Engineer',
    action: 'Query Dispatched',
    target: 'Gateway KB',
    code: 'GET /v2/orders/match?routing=optimal',
    status: 'Routing Request',
    badgeColor: 'text-cyan border-cyan/30 bg-cyan/10',
  },
  {
    step: '02',
    actor: 'Gateway KB',
    action: 'Inter-KB Traversal',
    target: 'Matching KB & Astrophage Core',
    code: 'Querying matching engine rules & balance checks',
    status: 'Traversing Mesh',
    badgeColor: 'text-neonPurple border-neonPurple/30 bg-neonPurple/10',
  },
  {
    step: '03',
    actor: 'Central Core',
    action: 'Contract Verification',
    target: 'Settlement KB',
    code: 'Validating payload against settlement schema v4',
    status: 'Verified 0ms Drift',
    badgeColor: 'text-emerald border-emerald/30 bg-emerald/10',
  },
];

export function RoutingSection() {
  const reduce = useReducedMotion();

  return (
    <section id="traversal" className="py-28 relative bg-[#040711]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Left Column Description */}
          <div className="lg:w-5/12 space-y-6">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric/10 border border-electric/30 text-electric text-xs font-mono tracking-widest uppercase"
            >
              <Route className="w-3.5 h-3.5" />
              <span>LIVE LINEAGE ROUTING</span>
            </motion.div>

            <motion.h2
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-space leading-tight"
            >
              Inter-Knowledge Base Traversal
            </motion.h2>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.16 }}
              className="text-base sm:text-lg text-zinc-400 leading-relaxed"
            >
              Instead of passing tens of thousands of unstructured tokens, autonomous coding agents query specific Knowledge Bases. Astrophage traces contracts across downstream services and returns verified context in milliseconds.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.24 }}
              className="space-y-3 pt-2 font-mono text-xs text-zinc-300"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan" />
                <span>Sub-15ms multi-hop query resolution</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neonPurple" />
                <span>Zero token budget exhaustion</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald" />
                <span>Cryptographic verification against raw git commit hashes</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column Terminal Traversal Flow */}
          <div className="lg:w-7/12 mt-12 lg:mt-0">
            <div className="glass-card-deep rounded-2xl border border-cyan/20 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              {/* Terminal Header */}
              <div className="px-6 py-4 bg-[#070B19]/90 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose/80" />
                  <div className="w-3 h-3 rounded-full bg-amber/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald/80" />
                  <span className="ml-3 font-mono text-xs text-zinc-400">
                    openkb-traversal-inspector.sh
                  </span>
                </div>
                <span className="font-mono text-[11px] text-cyan flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> LIVE MESH
                </span>
              </div>

              {/* Traversal Steps */}
              <div className="p-6 space-y-4 font-mono">
                {traversalSteps.map((item, idx) => (
                  <motion.div
                    key={item.step}
                    initial={reduce ? false : { opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15, duration: 0.5 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan/30 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-cyan font-bold">{item.step}</span>
                        <span>{item.actor}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="text-white font-bold">{item.target}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-xs text-electric bg-[#040711] p-2.5 rounded-lg border border-white/5 overflow-x-auto">
                      {item.code}
                    </div>
                  </motion.div>
                ))}

                {/* Final Verification Block */}
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="p-4 rounded-xl bg-emerald/10 border border-emerald/30 text-xs text-emerald flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Contract payload verified across 3 microservices. 0 hallucinations.</span>
                  </div>
                  <span className="font-bold text-[10px] tracking-wider uppercase bg-emerald/20 px-2.5 py-1 rounded-md">
                    200 OK &bull; 11ms
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
