'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Cpu, Network, FileCode2 } from 'lucide-react';

const problems = [
  {
    icon: Cpu,
    tag: 'TOKEN EXHAUSTION & LIMITS',
    tagColor: 'text-amber border-amber/30 bg-amber/10',
    title: 'Single-Repo AI Blindness',
    desc: 'AI coding assistants flood their context windows parsing thousands of raw source files to infer business logic that was already documented in specs and discussions.',
    stat: '100k+ tokens burned guessing logic',
  },
  {
    icon: Network,
    tag: 'ZERO CROSS-LINEAGE',
    tagColor: 'text-rose border-rose/30 bg-rose/10',
    title: 'Disconnected Microservice Silos',
    desc: 'Services like Order Matching, Auth, and Settlement operate with isolated repositories, tickets, and Slack channels. No unified dependency lineage connects them.',
    stat: '94% of breakages happen at boundaries',
  },
  {
    icon: FileCode2,
    tag: 'DOCUMENTATION DRIFT',
    tagColor: 'text-neonPurple border-neonPurple/30 bg-neonPurple/10',
    title: 'Stale Wikis & Untracked RFCs',
    desc: 'Specs written in Confluence or Notion decay the moment code ships. Human engineers lack the bandwidth to manually maintain synchronized documentation.',
    stat: 'Zero deterministic source grounding',
  },
];

export function ProblemSection() {
  const reduce = useReducedMotion();

  return (
    <section id="problem" className="py-28 relative bg-[#040711]">
      {/* Subtle top/bottom borders */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose/10 border border-rose/30 text-rose text-xs font-mono tracking-widest uppercase mb-4"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>THE ENTERPRISE REALITY</span>
          </motion.div>

          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-space"
          >
            In a large enterprise,
            <br />
            <span className="text-zinc-400">knowledge does not live in silos.</span>
          </motion.h2>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="text-base sm:text-lg text-zinc-400 mt-4 leading-relaxed"
          >
            Every engineering team produces fragmented artifacts across GitHub, Jira, Slack, and Notion. Without an orchestration layer, both developers and AI agents operate blind to the broader system.
          </motion.p>
        </div>

        {/* 3 Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((prob, i) => {
            const Icon = prob.icon;
            return (
              <motion.div
                key={prob.title}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative glass-card-deep p-8 rounded-2xl border border-white/10 hover:border-cyan/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan group-hover:text-electric transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-full border ${prob.tagColor}`}>
                      {prob.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white font-space mb-3">
                    {prob.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {prob.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 font-mono text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                  {prob.stat}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
