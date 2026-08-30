'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { GitBranch, Search, Globe } from 'lucide-react';

const steps = [
  {
    icon: GitBranch,
    title: 'Connect',
    desc: 'Link your repositories and Astrophage begins indexing your entire codebase automatically.',
  },
  {
    icon: Search,
    title: 'Analyze',
    desc: 'The knowledge graph builds itself from code, commits, and pull requests in real time.',
  },
  {
    icon: Globe,
    title: 'Navigate',
    desc: 'Search, explore, and trace any concept across your entire technology stack.',
  },
];

export function HowItWorksSection() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.8', 'end 0.5'],
  });
  const lineScale = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

  return (
    <section id="process" className="py-24 md:py-32 relative">
      {/* Background orb */}
      <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-nebula/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6">
        <motion.span
          className="inline-block text-xs font-mono uppercase tracking-[0.2em] text-stellar"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          The Process
        </motion.span>
        <motion.h2
          className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          Three steps to full visibility
        </motion.h2>

        {/* Timeline */}
        <div ref={sectionRef} className="relative mt-20">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-[2px]">
            <div className="absolute inset-0 bg-white/5 rounded-full" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-stellar to-stellar/10 rounded-full origin-top"
              style={{ scaleY: reduce ? 1 : lineScale }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-16 md:space-y-20">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  className="flex items-start gap-6 md:gap-8"
                  initial={reduce ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Node */}
                  <div className="relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full border border-stellar/30 bg-void flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-stellar shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                  </div>

                  {/* Content */}
                  <div className="pt-1 md:pt-3">
                    <h3 className="text-xl md:text-2xl font-bold text-white">{step.title}</h3>
                    <p className="text-zinc-400 mt-2 leading-relaxed max-w-lg">{step.desc}</p>
                    <Icon className="w-5 h-5 text-stellar/60 mt-3" strokeWidth={1.5} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
