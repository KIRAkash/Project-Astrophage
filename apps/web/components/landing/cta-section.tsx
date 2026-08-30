'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';
import Image from 'next/image';

export function CTASection() {
  const reduce = useReducedMotion();

  return (
    <section id="cta" className="py-36 relative overflow-hidden bg-[#070B19]">
      {/* Intense Ambient Glow Backdrops */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#7928CA]/30 via-[#00D2FF]/25 to-transparent rounded-full blur-[150px] pointer-events-none" />

      {/* Orbiting particles around CTA */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="w-[450px] h-[450px] md:w-[620px] md:h-[620px] rounded-full border border-cyan/15 relative"
          style={{
            animation: reduce ? 'none' : 'orbit-spin 28s linear infinite',
          }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan shadow-[0_0_15px_rgba(0,210,255,0.9)]" />
        </div>
        <div
          className="absolute w-[600px] h-[600px] md:w-[820px] md:h-[820px] rounded-full border border-neonPurple/15"
          style={{
            animation: reduce ? 'none' : 'orbit-spin 42s linear infinite reverse',
          }}
        >
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-neonPurple shadow-[0_0_15px_rgba(176,38,255,0.9)]" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        {/* Official Astrophage Cosmic Sphere Emblem */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative inline-flex items-center justify-center mb-8"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-[#040711] border-2 border-cyan/50 p-4 shadow-[0_0_50px_rgba(0,210,255,0.6)] flex items-center justify-center relative">
            <Image
              src="/assets/logos/logo.svg"
              alt="Astrophage Emblem"
              width={80}
              height={80}
              className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(0,210,255,0.95)]"
            />
          </div>
        </motion.div>

        {/* Brand Headline */}
        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-space uppercase"
        >
          ASTROPHAGE
        </motion.h2>

        {/* Tagline */}
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.18 }}
          className="text-sm sm:text-base font-mono font-bold tracking-[0.3em] text-cyan uppercase mt-3 mb-6"
        >
          ENTERPRISE INTELLIGENCE, ORCHESTRATED.
        </motion.p>

        {/* Brand Pillars */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.26 }}
          className="flex flex-wrap justify-center items-center gap-3 mb-10 text-xs font-mono"
        >
          <span className="px-4 py-1.5 rounded-full bg-cyan/10 border border-cyan/30 text-cyan">
            ✦ MULTI-KB FABRIC
          </span>
          <span className="px-4 py-1.5 rounded-full bg-neonPurple/10 border border-neonPurple/30 text-neonPurple">
            ⚡ REAL-TIME SYNTHESIS
          </span>
          <span className="px-4 py-1.5 rounded-full bg-emerald/10 border border-emerald/30 text-emerald">
            🛡️ VERIFIED ACCURACY
          </span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.34 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-cyan text-black px-9 py-4 font-bold text-sm uppercase tracking-wider hover:bg-cyan-light transition-all shadow-[0_0_35px_rgba(0,210,255,0.55)] active:scale-[0.98] w-full sm:w-auto"
          >
            Launch OpenKB Cluster
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.03] text-white px-8 py-4 font-mono text-xs uppercase tracking-wider hover:bg-white/10 hover:border-white/40 transition-all w-full sm:w-auto"
          >
            <Terminal className="w-4 h-4 text-cyan" />
            View OpenKB Specs
          </a>
        </motion.div>
      </div>
    </section>
  );
}
