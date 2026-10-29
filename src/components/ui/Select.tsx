import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid = false, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-h-11 w-full appearance-none rounded-[var(--radius-control)] border border-line bg-surface-2 pl-3 pr-10 text-base text-ink',
          'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid && 'border-red',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
});
