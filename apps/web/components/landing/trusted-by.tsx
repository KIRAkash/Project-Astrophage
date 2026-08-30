'use client';

import { motion, useReducedMotion } from 'framer-motion';

const logos = [
  { name: 'Google', slug: 'google' },
  { name: 'GitHub', slug: 'github' },
  { name: 'Stripe', slug: 'stripe' },
  { name: 'Vercel', slug: 'vercel' },
  { name: 'Datadog', slug: 'datadog' },
  { name: 'Cloudflare', slug: 'cloudflare' },
];

export function TrustedBySection() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-sm text-zinc-500 text-center font-mono uppercase tracking-wider mb-10">
          Trusted by engineering teams at
        </p>
        <motion.div
          className="flex flex-wrap justify-center items-center gap-8 md:gap-12"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {logos.map((logo) => (
            <img
              key={logo.slug}
              src={`https://cdn.simpleicons.org/${logo.slug}/ffffff`}
              alt={`${logo.name} logo`}
              className="h-5 md:h-6 opacity-40 hover:opacity-70 transition-opacity duration-300"
              loading="lazy"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
