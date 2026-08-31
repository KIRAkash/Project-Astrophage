'use client';

import { useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import Image from 'next/image';

const navLinks = [
  { label: 'Problem', href: '#problem' },
  { label: 'OpenKB Fabric', href: '#architecture' },
  { label: 'Live Traversal', href: '#traversal' },
  { label: 'Autonomous Ingestion', href: '#synthesis' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Scale', href: '#scale' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070B19]/85 backdrop-blur-xl border-b border-cyan/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center group transition-opacity hover:opacity-80">
          <Image
            src="/assets/logos/lockup-wordmark-white.svg"
            alt="Astrophage"
            width={200}
            height={48}
            className="h-12 w-auto object-contain"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <a
            href="#architecture"
            className="text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white px-3 py-2 transition-colors"
          >
            Architecture
          </a>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 rounded-full bg-cyan text-black px-5 py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-cyan-light transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)] active:scale-[0.98]"
          >
            Launch OpenKB
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden bg-[#070B19]/98 backdrop-blur-2xl border-t border-cyan/20 overflow-hidden"
          >
            <nav className="px-6 py-8 flex flex-col gap-4">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="text-base font-mono uppercase tracking-wider text-zinc-300 hover:text-cyan transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </motion.a>
              ))}
              <a
                href="#cta"
                className="mt-4 text-center rounded-full bg-cyan text-black px-6 py-3 font-bold text-sm uppercase tracking-wider"
                onClick={() => setMobileOpen(false)}
              >
                Launch OpenKB
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
