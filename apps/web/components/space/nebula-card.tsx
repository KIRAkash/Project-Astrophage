import { cn } from '@/lib/utils';
import React from 'react';

interface NebulaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'purple' | 'cyan' | 'amber' | 'green' | 'none';
  title?: string;
  description?: string;
}

export function NebulaCard({ 
  children, 
  className, 
  glow = 'purple', 
  title, 
  description,
  ...props 
}: NebulaCardProps) {
  const glowClasses = {
    purple: 'hover:border-nebula/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]',
    cyan: 'hover:border-stellar/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    amber: 'hover:border-pulsar/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    green: 'hover:border-orbit/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    none: ''
  };

  return (
    <div 
      className={cn(
        "glass-card transition-all duration-300", 
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="p-6 border-b border-white/5">
          {title && <h3 className="text-xl font-space font-semibold text-white">{title}</h3>}
          {description && <p className="text-sm text-gray-400 mt-1 font-mono">{description}</p>}
        </div>
      )}
      <div className={cn(title || description ? "p-6" : "")}>
        {children}
      </div>
    </div>
  );
}
