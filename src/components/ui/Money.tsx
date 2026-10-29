import { formatPEN } from '@/domain/money';
import type { Cents } from '@/domain/models';
import { cn } from '@/lib/cn';

export interface MoneyProps {
  cents: number;
  direction?: 'in' | 'out';
  signed?: boolean;
  className?: string;
}

export function Money({ cents, direction, signed = false, className }: MoneyProps) {
  const prefix = direction === 'out' ? '−' : direction === 'in' && signed ? '+' : '';

  return (
    <span className={cn('tabular whitespace-nowrap', className)}>
      {prefix}
      {formatPEN(cents as Cents)}
    </span>
  );
}
