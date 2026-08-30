'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GitPullRequest, RefreshCw, Sparkles, Check, ArrowRight } from 'lucide-react';

const synthesisFeatures = [
  {
    icon: GitPullRequest,
    tag: 'CONTINUOUS INGESTION',
    tagColor: 'text-cyan border-cyan/30 bg-cyan/10',
    title: 'Real-Time Git & Spec Ingestion',
    desc: 'Astrophage webhooks hook into GitHub, GitLab, and Confluence. When PRs merge or RFCs update, changes are parsed into AST representations and mapped immediately.',
    benefit: 'No manual documentation writing ever again',
  },
  {
    icon: RefreshCw,
    tag: 'AUTOMATED LINEAGE',
    tagColor: 'text-neonPurple border-neonPurple/30 bg-neonPurple/10',
    title: 'Self-Healing Dependency Lineage',
    desc: 'When an upstream service changes a schema or endpoint, dependent downstream Knowledge Bases automatically flag breaking contract changes before deployment.',
    benefit: 'Catch boundary regressions in CI/CD',
  },
  {
    icon: Sparkles,
    tag: 'DETERMINISTIC ACCURACY',
    tagColor: 'text-emerald border-emerald/30 bg-emerald/10',
    title: 'Zero Hallucination Guarantee',
    desc: 'Every answer served to engineers and autonomous coding agents includes direct citations pointing to exact commit SHAs, line ranges, and reviewed Jira tickets.',
    benefit: '100% cryptographic trace of truth',
  },
];

export function SynthesisSection() {
  const reduce = useReducedMotion();

  return (
    <section id="synthesis" className="py-28 relative bg-[#070B19]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-mono tracking-widest uppercase mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AUTONOMOUS SYNTHESIS</span>
          </motion.div>

          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-space"
          >
            Continuously Maintained by Agents
          </motion.h2>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="text-base sm:text-lg text-zinc-400 mt-4 leading-relaxed"
          >
            Software systems evolve at hundreds of commits per day. Astrophage autonomous agents synthesize and update the OpenKB fabric in real time with zero human overhead.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {synthesisFeatures.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative glass-card-deep p-8 rounded-2xl border border-white/10 hover:border-cyan/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-full border ${feat.tagColor}`}>
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white font-space mb-3">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 font-mono text-xs text-cyan">
                  <Check className="w-4 h-4 text-emerald flex-shrink-0" />
                  <span>{feat.benefit}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
