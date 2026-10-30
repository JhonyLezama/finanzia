import { ChartTable } from '@/components/charts/ChartTable';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatPercent } from '@/domain/money';
import type { CategoryBreakdownRow } from '@/domain/reports';

export interface CategoryChartProps {
  data: CategoryBreakdownRow[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const tableRows = data.map((item) => [
    <span key="name" className="font-medium text-ink">
      {item.categoryName}
    </span>,
    <span key="amt" className="text-ink font-semibold">
      <Money cents={item.amountCents} />
    </span>,
    <span key="share" className="text-ink-muted">
      {formatPercent(item.share)}
    </span>,
  ]);

  return (
    <ChartTable
      title="Gastos por categoría"
      tableName="Gastos por categoría"
      headers={['Categoría', 'Gasto', 'Participación']}
      rows={tableRows}
    >
      {data.length === 0 ? (
        <p className="text-xs text-ink-muted py-6 text-center">
          No hay gastos registrados en este período.
        </p>
      ) : (
        <div className="space-y-3.5 py-1">
          {data.map((item, idx) => {
            const pct = Math.round(item.share * 100);
            return (
              <div key={item.categoryId ?? `other-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{item.categoryName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      <Money cents={item.amountCents} />
                    </span>
                    <span className="text-ink-muted w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <ProgressBar value={pct} tone="ok" />
              </div>
            );
          })}
        </div>
      )}
    </ChartTable>
  );
}

