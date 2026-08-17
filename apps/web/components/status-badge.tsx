import { KBStatus } from '@/types/kb';
import { cn } from '@/lib/utils';
import { Database, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: KBStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', showIcon = true, showLabel = true, className }: StatusBadgeProps) {
  const config = {
    queued: { label: 'In the Void', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Database, anim: '' },
    ingesting: { label: 'Scanning Nebula', color: 'bg-stellar/20 text-stellar border-stellar/30', icon: Loader2, anim: 'animate-pulse' },
    generating: { label: 'Compiling Stars', color: 'bg-nebula/20 text-nebula-light border-nebula/30', icon: Sparkles, anim: 'animate-spin' },
    in_review: { label: 'Awaiting Launch', color: 'bg-pulsar/20 text-pulsar border-pulsar/30', icon: AlertCircle, anim: '' },
    published: { label: 'In Orbit', color: 'bg-orbit/20 text-orbit border-orbit/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]', icon: CheckCircle2, anim: '' },
    failed: { label: 'Signal Lost', color: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]', icon: AlertCircle, anim: 'animate-pulse' }
  };

  const { label, color, icon: Icon, anim } = config[status] || config.queued;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border backdrop-blur-sm font-mono", color, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn("w-4 h-4", anim)} />}
      {showLabel && <span>{label}</span>}
    </div>
  );
}
