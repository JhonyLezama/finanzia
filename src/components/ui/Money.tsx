import { cn } from '@/lib/cn';

export interface MoneyProps {
  cents: number;
  direction?: 'in' | 'out';
  signed?: boolean;
  className?: string;
}

const penFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Placeholder formatter owned by the UI layer; replaced by the domain formatter in Task 4. */
function formatPEN(cents: number): string {
  return penFormatter.format(cents / 100).replace(/[\u00a0\u202f]/g, ' ');
}

export function Money({ cents, direction, signed = false, className }: MoneyProps) {
  const prefix = direction === 'out' ? '−' : direction === 'in' && signed ? '+' : '';

  return (
    <span className={cn('tabular whitespace-nowrap', className)}>
      {prefix}
      {formatPEN(cents)}
    </span>
  );
}
