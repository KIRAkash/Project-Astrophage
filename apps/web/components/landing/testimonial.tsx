'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function TestimonialSection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-28 relative bg-[#040711] border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <span className="text-6xl md:text-7xl text-cyan/30 font-serif leading-none select-none block mb-6">
            &ldquo;
          </span>
          <blockquote className="text-2xl sm:text-3xl text-white font-space leading-relaxed max-w-3xl mx-auto text-center font-normal">
            Astrophage eliminated our cross-service API breakages. Our autonomous agents can now safely navigate dozens of microservices without hallucinating contracts.
          </blockquote>
          <div className="mt-8 text-center space-y-1">
            <span className="text-white font-bold font-space block text-lg">Sarah Lin</span>
            <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider block">
              VP of Architecture, Apex Global Financial
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
