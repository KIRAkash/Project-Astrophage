'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Network, BookOpen, Code, Layers, Users } from 'lucide-react';

const features = [
  {
    icon: Network,
    title: 'Knowledge Graph',
    desc: 'Automatically builds a living map of your entire codebase architecture and relationships.',
    span: 'md:col-span-2 md:row-span-2',
    bg: 'bg-gradient-to-br from-stellar/10 via-transparent to-transparent',
    minH: 'min-h-[200px] md:min-h-[340px]',
  },
  {
    icon: BookOpen,
    title: 'Auto-Documentation',
    desc: 'Generates and maintains docs from your actual source code.',
    span: 'md:col-span-1',
    bg: 'bg-white/[0.03]',
    minH: '',
  },
  {
    icon: Code,
    title: 'Code Intelligence',
    desc: 'Understands context across repositories for faster onboarding.',
    span: 'md:col-span-1',
    bg: 'bg-white/[0.03]',
    minH: '',
  },
  {
    icon: Layers,
    title: 'Architecture Mapping',
    desc: 'Visualizes dependencies, services, and data flows across your entire system.',
    span: 'md:col-span-2',
    bg: 'bg-gradient-to-br from-nebula/8 via-transparent to-transparent',
    minH: '',
  },
  {
    icon: Users,
    title: 'Team Insights',
    desc: 'See who owns what and how knowledge flows through your org.',
    span: 'md:col-span-1',
    bg: 'bg-white/[0.03]',
    minH: '',
  },
];

export function FeaturesSection() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Core capabilities
        </motion.h2>
        <motion.p
          className="text-lg text-zinc-400 text-center max-w-2xl mx-auto mt-4 mb-16"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          Everything your engineering team needs to understand, navigate, and evolve your codebase.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                className={`group relative ${feat.span} ${feat.bg} ${feat.minH} border border-white/10 rounded-xl p-6 md:p-8 overflow-hidden hover:border-stellar/20 transition-colors`}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Hover glow overlay */}
                <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-stellar/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <Icon className="w-8 h-8 text-stellar mb-4" strokeWidth={1.5} />
                  <h3 className="text-xl font-bold text-white">{feat.title}</h3>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed max-w-md">{feat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
