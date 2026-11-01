import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { formatPercent } from '@/domain/money';
import type { AnnualReport } from '@/domain/reports';

export interface AnnualTableProps {
  annual: AnnualReport | null;
}

export function AnnualTable({ annual }: AnnualTableProps) {
  if (!annual) return null;

  const { year, rows, totals } = annual;

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-lg text-ink">Resumen anual {year}</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Evolución mes a mes durante todo el año fiscal.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          aria-label={`Resumen anual ${year}`}
        >
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <th scope="col" className="pb-2 px-3 first:pl-0">Mes</th>
              <th scope="col" className="pb-2 px-3 text-right">Ingresos</th>
              <th scope="col" className="pb-2 px-3 text-right">Gastos</th>
              <th scope="col" className="pb-2 px-3 text-right">Ahorro neto</th>
              <th scope="col" className="pb-2 px-3 last:pr-0 text-right">Tasa de ahorro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.month} className="hover:bg-surface-2">
                <td className="py-2.5 px-3 first:pl-0 font-medium text-ink">
                  {row.month}
                </td>
                <td className="py-2.5 px-3 text-right text-primary font-medium">
                  <Money cents={row.incomeCents} />
                </td>
                <td className="py-2.5 px-3 text-right text-ink">
                  <Money cents={row.expenseCents} />
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-semibold ${
                    row.savingsCents >= 0 ? 'text-primary' : 'text-red'
                  }`}
                >
                  <Money cents={row.savingsCents} />
                </td>
                <td className="py-2.5 px-3 last:pr-0 text-right text-ink-muted">
                  {formatPercent(row.savingsRate)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-bold text-ink bg-surface-2">
              <td className="py-3 px-3 first:pl-0 uppercase text-xs">Total anual</td>
              <td className="py-3 px-3 text-right text-primary">
                <Money cents={totals.incomeCents} />
              </td>
              <td className="py-3 px-3 text-right">
                <Money cents={totals.expenseCents} />
              </td>
              <td
                className={`py-3 px-3 text-right ${
                  totals.savingsCents >= 0 ? 'text-primary' : 'text-red'
                }`}
              >
                <Money cents={totals.savingsCents} />
              </td>
              <td className="py-3 px-3 last:pr-0 text-right">
                {formatPercent(totals.savingsRate)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

