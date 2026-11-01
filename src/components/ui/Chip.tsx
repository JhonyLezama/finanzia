import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ChipTone = 'neutral' | 'positive' | 'gold' | 'danger';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

const toneClasses: Record<ChipTone, string> = {
  neutral: 'border-line-strong bg-surface-2 text-ink-muted',
  positive: 'border-primary/30 bg-primary/10 text-primary',
  gold: 'border-gold/40 bg-gold/15 text-gold-ink',
  danger: 'border-red/30 bg-red-soft text-red',
};

export function Chip({ tone = 'neutral', className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
