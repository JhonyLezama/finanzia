import { Calculator, X } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useReducer, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import {
  calculatorDisplay,
  calculatorError,
  calculatorExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
} from './calculator';

type KeyTone = 'default' | 'muted' | 'accent' | 'primary';

interface KeyDefinition {
  label: string;
  ariaLabel: string;
  action: CalculatorAction;
  tone?: KeyTone;
}

const KEYS: KeyDefinition[][] = [
  [
    { label: 'C', ariaLabel: 'Limpiar', action: { type: 'clear' }, tone: 'muted' },
    {
      label: '⌫',
      ariaLabel: 'Borrar último dígito',
      action: { type: 'backspace' },
      tone: 'muted',
    },
    { label: '%', ariaLabel: 'Porcentaje', action: { type: 'percent' }, tone: 'muted' },
    {
      label: '÷',
      ariaLabel: 'Dividir',
      action: { type: 'operator', operator: '÷' },
      tone: 'accent',
    },
  ],
  [
    { label: '7', ariaLabel: '7', action: { type: 'digit', digit: '7' } },
    { label: '8', ariaLabel: '8', action: { type: 'digit', digit: '8' } },
    { label: '9', ariaLabel: '9', action: { type: 'digit', digit: '9' } },
    {
      label: '×',
      ariaLabel: 'Multiplicar',
      action: { type: 'operator', operator: '×' },
      tone: 'accent',
    },
  ],
  [
    { label: '4', ariaLabel: '4', action: { type: 'digit', digit: '4' } },
    { label: '5', ariaLabel: '5', action: { type: 'digit', digit: '5' } },
    { label: '6', ariaLabel: '6', action: { type: 'digit', digit: '6' } },
    {
      label: '−',
      ariaLabel: 'Restar',
      action: { type: 'operator', operator: '-' },
      tone: 'accent',
    },
  ],
  [
    { label: '1', ariaLabel: '1', action: { type: 'digit', digit: '1' } },
    { label: '2', ariaLabel: '2', action: { type: 'digit', digit: '2' } },
    { label: '3', ariaLabel: '3', action: { type: 'digit', digit: '3' } },
    {
      label: '+',
      ariaLabel: 'Sumar',
      action: { type: 'operator', operator: '+' },
      tone: 'accent',
    },
  ],
  [
    { label: '±', ariaLabel: 'Cambiar signo', action: { type: 'sign' }, tone: 'muted' },
    { label: '0', ariaLabel: '0', action: { type: 'digit', digit: '0' } },
    { label: '.', ariaLabel: 'Punto decimal', action: { type: 'decimal' } },
    { label: '=', ariaLabel: 'Igual', action: { type: 'equals' }, tone: 'primary' },
  ],
];

const toneClasses: Record<KeyTone, string> = {
  default: 'border border-line bg-surface-2 text-ink hover:bg-surface',
  muted: 'border border-line bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink',
  accent: 'border border-line bg-surface-2 text-primary hover:bg-surface',
  primary: 'bg-primary text-primary-ink hover:brightness-110',
};

function keyToAction(key: string): CalculatorAction | null {
  if (/^\d$/.test(key)) {
    return { type: 'digit', digit: key };
  }

  switch (key) {
    case '.':
    case ',':
      return { type: 'decimal' };
    case '+':
      return { type: 'operator', operator: '+' };
    case '-':
      return { type: 'operator', operator: '-' };
    case '*':
    case 'x':
    case 'X':
      return { type: 'operator', operator: '×' };
    case '/':
      return { type: 'operator', operator: '÷' };
    case '%':
      return { type: 'percent' };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Backspace':
      return { type: 'backspace' };
    case 'Delete':
    case 'c':
    case 'C':
      return { type: 'clear' };
    default:
      return null;
  }
}

export function FloatingCalculator() {
  const [state, dispatch] = useReducer(reduceCalculator, initialCalculatorState);
  const contentRef = useRef<HTMLDivElement>(null);

  const display = calculatorDisplay(state);
  const expression = calculatorExpression(state);
  const error = calculatorError(state);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const onButton = target.closest('button') !== null;
    if (onButton && (event.key === 'Enter' || event.key === ' ')) {
      return;
    }

    const action = keyToAction(event.key);
    if (!action) {
      return;
    }
    event.preventDefault();
    dispatch(action);
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir calculadora"
          className={cn(
            'fixed bottom-36 right-4 z-30 flex size-12 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-card transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus print:hidden',
            'data-[state=open]:bg-primary data-[state=open]:text-primary-ink lg:bottom-6 lg:right-6 lg:size-14',
          )}
        >
          <Calculator className="size-5 lg:size-6" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          role="dialog"
          aria-label="Calculadora"
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus();
          }}
          onKeyDown={handleKeyDown}
          className="z-50 w-[min(92vw,19rem)] rounded-[var(--radius-card)] border border-line-strong bg-surface p-3 shadow-pop focus:outline-none print:hidden"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">Calculadora</h2>
            <Popover.Close asChild>
              <button
                type="button"
                aria-label="Cerrar calculadora"
                className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Popover.Close>
          </div>

          <div className="rounded-[var(--radius-control)] border border-line bg-surface-2 px-3 py-2 text-right">
            <p className="min-h-4 truncate text-xs text-ink-muted" aria-hidden="true">
              {expression || '\u00a0'}
            </p>
            <output
              aria-label="Resultado"
              aria-live="polite"
              className="block truncate text-3xl font-semibold tabular-nums text-ink"
            >
              {display}
            </output>
          </div>

          {error ? (
            <p role="alert" className="mt-1 text-xs text-red">
              {error}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-4 gap-2">
            {KEYS.flat().map((key) => (
              <button
                key={`${key.ariaLabel}-${key.label}`}
                type="button"
                aria-label={key.ariaLabel}
                onClick={() => dispatch(key.action)}
                className={cn(
                  'flex min-h-11 items-center justify-center rounded-[var(--radius-control)] text-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  toneClasses[key.tone ?? 'default'],
                )}
              >
                {key.label}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
