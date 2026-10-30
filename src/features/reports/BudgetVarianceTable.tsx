import { Card } from '@/components/ui/Card';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatPercent } from '@/domain/money';
import type { BudgetVarianceRow } from '@/domain/reports';

export interface BudgetVarianceTableProps {
  rows: BudgetVarianceRow[];
}

export function BudgetVarianceTable({ rows }: BudgetVarianceTableProps) {
  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-lg text-ink">Presupuesto vs. Real</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Compará tus gastos ejecutados contra lo planificado por categoría.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-ink-muted py-6 text-center">
          No hay gastos ni presupuestos asignados en este período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-sm"
            aria-label="Presupuesto vs Real por categoría"
          >
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <th scope="col" className="pb-2 px-3 first:pl-0">Categoría</th>
                <th scope="col" className="pb-2 px-3">Grupo</th>
                <th scope="col" className="pb-2 px-3 text-right">Planificado</th>
                <th scope="col" className="pb-2 px-3 text-right">Real</th>
                <th scope="col" className="pb-2 px-3 text-right">Desvío</th>
                <th scope="col" className="pb-2 px-3 last:pr-0 text-right">% Desvío</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((row, idx) => {
                const isOver = row.varianceCents > 0;
                const isUnder = row.varianceCents < 0;
                const chipTone: ChipTone =
                  row.group === 'fixed' ? 'neutral' : row.group === 'variable' ? 'positive' : 'gold';
                const groupLabel =
                  row.group === 'fixed'
                    ? 'Fijo'
                    : row.group === 'variable'
                      ? 'Variable'
                      : 'Sin grupo';

                return (
                  <tr key={row.categoryId ?? `un-${idx}`} className="hover:bg-surface-2/50">
                    <td className="py-2.5 px-3 first:pl-0 font-medium text-ink">
                      {row.categoryName}
                    </td>
                    <td className="py-2.5 px-3">
                      <Chip tone={chipTone}>{groupLabel}</Chip>
                    </td>
                    <td className="py-2.5 px-3 text-right text-ink-muted">
                      <Money cents={row.planCents} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-ink">
                      <Money cents={row.actualCents} />
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        isOver ? 'text-red' : isUnder ? 'text-primary' : 'text-ink-muted'
                      }`}
                    >
                      {row.varianceCents > 0 ? '+' : ''}
                      <Money cents={row.varianceCents} />
                    </td>
                    <td
                      className={`py-2.5 px-3 last:pr-0 text-right ${
                        isOver ? 'text-red font-medium' : isUnder ? 'text-primary' : 'text-ink-muted'
                      }`}
                    >
                      {formatPercent(row.variancePct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
