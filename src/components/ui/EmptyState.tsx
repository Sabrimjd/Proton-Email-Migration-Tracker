'use client';

import { type ReactNode } from 'react';
import { Mail, Search, AlertCircle, Inbox, Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error' | 'empty';
}

export function EmptyState({ icon, title, description, action, variant = 'default' }: EmptyStateProps) {
  const defaultIcons = {
    default: <Mail className="w-10 h-10" />,
    search: <Search className="w-10 h-10" />,
    error: <AlertCircle className="w-10 h-10" />,
    empty: <Inbox className="w-10 h-10" />,
  };

  const iconStyles = {
    default: 'text-white/30',
    search: 'text-white/30',
    error: 'text-red-400/50',
    empty: 'text-white/30',
  };

  return (
    <div className="text-center py-12">
      <div className={`mx-auto mb-4 opacity-60 ${iconStyles[variant]}`}>
        {icon || defaultIcons[variant]}
      </div>
      <p className="text-sm font-mono text-white/60 mb-2">{title}</p>
      {description && (
        <p className="text-xs font-mono text-white/40 mb-4">{description}</p>
      )}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Skeleton components for loading states
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/[0.05] rounded ${className}`} />
  );
}

export function ServiceSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
      <div className="flex items-center gap-3">
        <Skeleton className="w-4 h-4 rounded-sm" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ServicesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>
  );
}
