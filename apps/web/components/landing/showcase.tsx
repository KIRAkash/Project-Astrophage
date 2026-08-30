'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import Image from 'next/image';

export function ShowcaseSection() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  return (
    <section id="architecture" ref={containerRef} className="py-24 md:py-32 relative">
      {/* Background glow orb */}
      <div className="absolute -left-40 top-1/3 w-[400px] h-[400px] bg-stellar/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          See your architecture. All of it.
        </motion.h2>
        <motion.p
          className="text-lg text-zinc-400 text-center max-w-2xl mx-auto mt-4 mb-12"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          From microservices to monorepos, Astrophage renders your system as one navigable map.
        </motion.p>

        <motion.div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-stellar/5"
          style={{ y: reduce ? 0 : y }}
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative w-full aspect-[16/9]">
            <Image
              src="/images/landing/architecture-visualization.jpg"
              alt="Astrophage codebase architecture visualization showing interconnected knowledge graph nodes"
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-void/60 via-transparent to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}
