import Image from 'next/image';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-16 bg-[#040711]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:justify-between gap-12 pb-14">
          {/* Brand Column */}
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/logos/lockup-wordmark-white.svg"
                alt="Astrophage Logo"
                width={150}
                height={24}
                className="h-6 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              OpenKB: Autonomous Multi-KB Knowledge Fabric for enterprise architecture and AI code agents.
            </p>
            <div className="pt-2 flex items-center gap-2 font-mono text-[11px] text-cyan">
              <span className="w-2 h-2 rounded-full bg-emerald shadow-[0_0_8px_#10B981] animate-pulse" />
              <span>OpenKB Mesh Status: Operational</span>
            </div>
          </div>

          {/* Directory Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-16">
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                Architecture
              </h4>
              <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                <li><a href="#architecture" className="hover:text-cyan transition-colors">Dual-Plane Model</a></li>
                <li><a href="#traversal" className="hover:text-cyan transition-colors">Inter-KB Lineage</a></li>
                <li><a href="#synthesis" className="hover:text-cyan transition-colors">Autonomous Ingestion</a></li>
                <li><a href="#integrations" className="hover:text-cyan transition-colors">Ecosystem Connectors</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                Platform
              </h4>
              <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                <li><a href="/dashboard" className="hover:text-cyan transition-colors">Cluster Console</a></li>
                <li><a href="/orgs" className="hover:text-cyan transition-colors">Knowledge Spaces</a></li>
                <li><a href="/architecture" className="hover:text-cyan transition-colors">Graph Explorer</a></li>
                <li><a href="#scale" className="hover:text-cyan transition-colors">Benchmarks</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                Security & Enterprise
              </h4>
              <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                <li><a href="#" className="hover:text-cyan transition-colors">SOC2 Compliance</a></li>
                <li><a href="#" className="hover:text-cyan transition-colors">VPC Peering</a></li>
                <li><a href="#" className="hover:text-cyan transition-colors">Self-Hosted Deploy</a></li>
                <li><a href="#" className="hover:text-cyan transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-400">
          <p>&copy; 2026 Astrophage Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-zinc-400 hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="text-zinc-400 hover:text-white transition-colors cursor-pointer">Security Protocol</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
