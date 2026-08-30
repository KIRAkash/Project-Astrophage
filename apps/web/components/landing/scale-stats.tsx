'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, animate } from 'framer-motion';

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (reduce) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(0, value, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.floor(latest));
      },
    });

    return () => controls.stop();
  }, [isInView, value, reduce]);

  return (
    <span ref={ref} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-space block tracking-tight">
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 10000, suffix: '+', label: 'Repositories & Microservices' },
  { value: 15, prefix: '< ', suffix: 'ms', label: 'Cross-KB Traversal Latency' },
  { value: 100000, suffix: '+', label: 'Verified API Contracts' },
  { value: 0, suffix: '%', label: 'Contract Drift & Regressions' },
];

export function ScaleSection() {
  const reduce = useReducedMotion();

  return (
    <section id="scale" className="py-28 relative bg-[#070B19]">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-mono uppercase tracking-[0.25em] text-cyan mb-3"
          >
            ENTERPRISE SCALE
          </motion.p>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-space"
          >
            Engineered for global microservice fleets
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="text-base text-zinc-400 mt-4 leading-relaxed"
          >
            Tested on massive monorepos and distributed enterprise architectures with sub-millisecond query performance.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card-deep p-8 rounded-2xl border border-white/10 text-center relative overflow-hidden group hover:border-cyan/40 transition-all"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan/20 transition-all" />
              <div className="relative z-10">
                <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 mt-3">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
