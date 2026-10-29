import { cn } from '@/lib/cn';

export type ProgressTone = 'ok' | 'warn' | 'bad';

export interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  label?: string;
  className?: string;
}

const toneClasses: Record<ProgressTone, string> = {
  ok: 'bg-primary',
  warn: 'bg-gold',
  bad: 'bg-red',
};

export function ProgressBar({ value, tone, label = 'Progreso', className }: ProgressBarProps) {
  const resolvedTone: ProgressTone = tone ?? (value > 100 ? 'bad' : value >= 80 ? 'warn' : 'ok');
  const width = `${Math.min(100, Math.max(0, value))}%`;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      data-tone={resolvedTone}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', toneClasses[resolvedTone])}
        style={{ width }}
      />
    </div>
  );
}
