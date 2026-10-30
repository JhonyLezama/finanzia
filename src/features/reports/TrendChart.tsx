import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTable } from '@/components/charts/ChartTable';
import { Money } from '@/components/ui/Money';
import { formatPEN, formatPercent } from '@/domain/money';
import type { Cents } from '@/domain/models';
import type { TrendPoint } from './useReports';

export interface TrendChartProps {
  data: TrendPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    incomePEN: d.incomeCents / 100,
    expensePEN: d.expenseCents / 100,
    savingsRatePercent: d.savingsRate != null ? Math.round(d.savingsRate * 1000) / 10 : 0,
  }));

  const tableRows = data.map((d) => [
    <span key="month" className="font-medium text-ink">
      {d.month}
    </span>,
    <span key="inc" className="text-primary font-medium">
      <Money cents={d.incomeCents} />
    </span>,
    <span key="exp" className="text-ink">
      <Money cents={d.expenseCents} />
    </span>,
    <span
      key="sav"
      className={d.savingsCents >= 0 ? 'text-primary font-medium' : 'text-red font-medium'}
    >
      <Money cents={d.savingsCents} />
    </span>,
    <span key="rate" className="text-ink-muted">
      {formatPercent(d.savingsRate)}
    </span>,
  ]);

  return (
    <ChartTable
      title="Tendencia de 12 meses"
      tableName="Tendencia de 12 meses"
      headers={['Mes', 'Ingresos', 'Gastos', 'Ahorro neto', 'Tasa']}
      rows={tableRows}
    >
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `S/ ${v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Tasa de ahorro') {
                  return [`${value}%`, name];
                }
                const num = Number(value);
                return [formatPEN(Math.round(num * 100) as Cents), name];
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="incomePEN"
              name="Ingresos"
              fill="var(--color-primary, #10b981)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="expensePEN"
              name="Gastos"
              fill="var(--color-red, #f43f5e)"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="savingsRatePercent"
              name="Tasa de ahorro"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartTable>
  );
}

