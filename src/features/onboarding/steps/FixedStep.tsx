import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Category } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { FixedPayload } from '../useOnboarding';

export interface FixedStepProps {
  busy: boolean;
  error: string | null;
  categories: Category[];
  onSubmit: (rows: FixedPayload[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

interface FixedRowState {
  id: string;
  name: string;
  amount: string;
  day: string;
  categoryId: string;
}

const MAX_ROWS = 5;
const days = Array.from({ length: 31 }, (_, index) => index + 1);

function newRow(categoryId: string): FixedRowState {
  return {
    id: crypto.randomUUID(),
    name: '',
    amount: '',
    day: '1',
    categoryId,
  };
}

export function FixedStep({
  busy,
  error,
  categories,
  onSubmit,
  onSkip,
  onBack,
}: FixedStepProps) {
  const [rows, setRows] = useState<FixedRowState[]>(() => [
    newRow(categories[0]?.id ?? ''),
  ]);
  const [localError, setLocalError] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<FixedRowState>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const payload: FixedPayload[] = [];

    for (const [index, row] of rows.entries()) {
      const touched = Boolean(row.name.trim() || row.amount.trim());
      if (!touched) {
        continue;
      }

      if (!row.name.trim() || !row.amount.trim()) {
        setLocalError(`Completá nombre y monto en el gasto fijo ${index + 1}.`);
        return;
      }

      if (!row.categoryId) {
        setLocalError(`Elegí una categoría para el gasto fijo ${index + 1}.`);
        return;
      }

      try {
        payload.push({
          name: row.name.trim(),
          amountCents: parseAmountInput(row.amount),
          dayOfMonth: Number(row.day),
          categoryId: row.categoryId,
        });
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Monto inválido.';
        setLocalError(`Gasto fijo ${index + 1}: ${detail}`);
        return;
      }
    }

    if (payload.length === 0) {
      setLocalError('Agregá al menos un gasto fijo o elegí omitir.');
      return;
    }

    onSubmit(payload);
  }

  const message = localError ?? error;

  return (
    <section aria-labelledby="onboarding-fixed">
      <h1 id="onboarding-fixed" className="text-2xl font-semibold tracking-tight text-ink">
        Tus gastos fijos
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Alquiler, servicios, suscripciones. Los reservamos cada mes para que no se coman
        tu disponible por sorpresa.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {categories.length === 0 ? (
          <p className="rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
            No hay categorías fijas disponibles. Podés omitir este paso y crearlas en
            Ajustes.
          </p>
        ) : null}

        <ol className="space-y-4">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">Gasto fijo {index + 1}</h2>
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRows((current) => current.filter((entry) => entry.id !== row.id))
                    }
                    disabled={busy}
                  >
                    Quitar gasto {index + 1}
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`fixed-name-${row.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Nombre del gasto {index + 1}
                  </label>
                  <Input
                    id={`fixed-name-${row.id}`}
                    value={row.name}
                    onChange={(event) => updateRow(row.id, { name: event.target.value })}
                    placeholder="Alquiler"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`fixed-amount-${row.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Monto del gasto {index + 1}
                  </label>
                  <Input
                    id={`fixed-amount-${row.id}`}
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                    placeholder="380.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`fixed-day-${row.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Día de pago {index + 1}
                  </label>
                  <Select
                    id={`fixed-day-${row.id}`}
                    value={row.day}
                    onChange={(event) => updateRow(row.id, { day: event.target.value })}
                  >
                    {days.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor={`fixed-category-${row.id}`}
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Categoría del gasto {index + 1}
                  </label>
                  <Select
                    id={`fixed-category-${row.id}`}
                    value={row.categoryId}
                    onChange={(event) =>
                      updateRow(row.id, { categoryId: event.target.value })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {rows.length < MAX_ROWS ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setRows((current) => [...current, newRow(categories[0]?.id ?? '')])
            }
            disabled={busy || categories.length === 0}
          >
            Agregar gasto fijo
          </Button>
        ) : null}

        {message ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
            {message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
          <Button
            type="submit"
            loading={busy}
            disabled={categories.length === 0}
            className="sm:flex-1"
          >
            Continuar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onSkip}
            disabled={busy}
            className="sm:flex-1"
          >
            Omitir por ahora
          </Button>
          <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
            Atrás
          </Button>
        </div>
      </form>
    </section>
  );
}
