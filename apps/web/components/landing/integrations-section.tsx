'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';

const sources = [
  { name: 'GitHub', type: 'Repositories & PRs', icon: '/assets/sources/github.png' },
  { name: 'Confluence', type: 'Architecture RFCs', icon: '/assets/sources/Confluence.png' },
  { name: 'Jira', type: 'Issues & Epics', icon: '/assets/sources/jira-1.svg' },
  { name: 'Slack', type: 'Design Discussions', icon: '/assets/sources/Slack_icon_2019.svg.webp' },
  { name: 'Notion', type: 'Team Specs & Guides', icon: '/assets/sources/Notion_app_logo.png' },
  { name: 'Google Cloud', type: 'Cloud Infrastructure', icon: '/assets/google/google.png' },
  { name: 'Gemini', type: 'Reasoning Engine', icon: '/assets/google/Google_Gemini.webp' },
  { name: 'Cloud Run', type: 'Container Mesh', icon: '/assets/google/cloudrun.png' },
];

export function IntegrationsSection() {
  const reduce = useReducedMotion();

  return (
    <section id="integrations" className="py-24 relative bg-[#040711] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-mono uppercase tracking-[0.25em] text-cyan mb-3"
          >
            ENTERPRISE ECOSYSTEM
          </motion.p>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-space"
          >
            Synchronized with your entire tech stack
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="text-sm sm:text-base text-zinc-400 mt-3"
          >
            Continuous ingest connectors for code repositories, project tracking, documentation wikis, and cloud infrastructure.
          </motion.p>
        </div>

        {/* Integration Tiles */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {sources.map((item) => (
            <div
              key={item.name}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center hover:border-cyan/40 hover:bg-white/[0.04] transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center p-2.5 mb-4 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <Image
                  src={item.icon}
                  alt={`${item.name} logo`}
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-space font-bold text-white text-base mb-1">
                {item.name}
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                {item.type}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
