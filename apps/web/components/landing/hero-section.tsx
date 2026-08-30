'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Terminal, Sparkles, Layers, Activity, Shield, Orbit } from 'lucide-react';
import Image from 'next/image';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative pt-32 pb-16 overflow-hidden bg-[#040711]">
      {/* Ambient Volumetric Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-cyan/15 via-neonPurple/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <motion.div
          variants={reduce ? undefined : stagger}
          initial={reduce ? undefined : 'hidden'}
          animate="visible"
          className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8"
        >
          {/* Official Pill Badge */}
          <motion.div
            variants={reduce ? undefined : fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-cyan/40 backdrop-blur-xl shadow-[0_0_25px_rgba(0,210,255,0.25)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-white uppercase">
              THE AUTONOMOUS MULTI-KB FABRIC
            </span>
          </motion.div>

          {/* Master Headline */}
          <motion.h1
            variants={reduce ? undefined : fadeUp}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.06] font-space"
          >
            Enterprise Intelligence,
            <br />
            <span className="bg-gradient-to-r from-cyan via-electric to-neonPurple bg-clip-text text-transparent filter drop-shadow-[0_0_35px_rgba(0,210,255,0.4)]">
              Orchestrated.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={reduce ? undefined : fadeUp}
            className="text-lg sm:text-xl text-zinc-300 max-w-2xl leading-relaxed font-sans"
          >
            Astrophage decouples your physical repositories from an active, queryable semantic layer. Connecting every microservice, spec, and team with zero documentation drift.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={reduce ? undefined : fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full sm:w-auto"
          >
            <a
              href="#cta"
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-cyan text-black px-9 py-4 font-bold text-sm uppercase tracking-wider hover:bg-cyan-light transition-all shadow-[0_0_35px_rgba(0,210,255,0.55)] active:scale-[0.98] w-full sm:w-auto"
            >
              Launch OpenKB Cluster
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#interactive-mesh"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] text-white px-8 py-4 font-mono text-xs uppercase tracking-wider hover:bg-white/10 hover:border-cyan/50 transition-all w-full sm:w-auto"
            >
              <Orbit className="w-4 h-4 text-cyan" />
              Explore 3D Mesh Stage
            </a>
          </motion.div>

          {/* Live Telemetry Bar */}
          <motion.div
            variants={reduce ? undefined : fadeUp}
            className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-zinc-400"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald shadow-[0_0_8px_#10B981]" />
              <span>Mesh State: 100% Synchronized</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_#00D2FF]" />
              <span>Query Latency: &lt; 15ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neonPurple shadow-[0_0_8px_#B026FF]" />
              <span>Zero Token Exhaustion</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
