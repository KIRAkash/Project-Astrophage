import { cn } from '@/lib/utils';
import React from 'react';

interface OrbitLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function OrbitLoader({ size = 'md', label, className }: OrbitLoaderProps) {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-40 h-40'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative flex items-center justify-center", sizeMap[size])}>
        {/* Central Core */}
        <div className="absolute w-1/4 h-1/4 bg-nebula rounded-full animate-pulse-glow glow-purple shadow-[0_0_15px_#7c3aed]" />
        
        {/* Outer Orbit 1 */}
        <div className="absolute w-full h-full border border-stellar/30 rounded-full animate-orbit-spin">
          <div className="absolute -top-1 left-1/2 w-2 h-2 bg-stellar rounded-full shadow-[0_0_10px_#06b6d4]" />
        </div>
        
        {/* Inner Orbit 2 */}
        <div className="absolute w-3/4 h-3/4 border border-pulsar/30 rounded-full animate-orbit-spin" style={{ animationDuration: '7s', animationDirection: 'reverse' }}>
          <div className="absolute top-1/4 -left-1 w-1.5 h-1.5 bg-pulsar rounded-full shadow-[0_0_10px_#f59e0b]" />
        </div>
      </div>
      {label && <p className="text-sm font-mono text-stellar-light/80 animate-pulse">{label}</p>}
    </div>
  );
}
