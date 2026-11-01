import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { addMonths, formatMonthLong } from '@/domain/dates';
import type { MonthKey } from '@/domain/models';
import { AnnualTable } from './AnnualTable';
import { BudgetVarianceTable } from './BudgetVarianceTable';
import { CategoryChart } from './CategoryChart';
import { KpiGrid } from './KpiGrid';
import { TrendChart } from './TrendChart';
import { useReports } from './useReports';

export interface ReportsPageProps {
  initialMonth?: MonthKey;
}

export default function ReportsPage({ initialMonth }: ReportsPageProps) {
  const {
    selectedMonth,
    setSelectedMonth,
    monthly,
    annual,
    categoryBreakdown,
    trend,
    exportMonthlyCsv,
    exportAnnualCsv,
  } = useReports(initialMonth);

  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');

  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);
  const printedOn = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date());

  return (
    <section className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
            Reportes
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Compará presupuesto contra real, mirá tendencias y entendé en qué se va tu dinero.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="inline-flex rounded-[var(--radius-control)] border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded-[calc(var(--radius-control)-2px)] transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-primary text-primary-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1 text-xs font-medium rounded-[calc(var(--radius-control)-2px)] transition-colors ${
                viewMode === 'annual'
                  ? 'bg-primary text-primary-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Anual
            </button>
          </div>

          {/* Export CSV */}
          <Button
            variant="secondary"
            size="sm"
            onClick={viewMode === 'monthly' ? exportMonthlyCsv : exportAnnualCsv}
          >
            <Download className="size-4 mr-1.5" />
            {viewMode === 'monthly' ? 'Exportar CSV' : 'Exportar CSV anual'}
          </Button>

          {/* Print */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            aria-label="Imprimir reporte"
          >
            <Printer className="size-4 mr-1.5" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Month Navigator (visible only in monthly view) */}
      {viewMode === 'monthly' ? (
        <div className="flex items-center justify-between border-b border-line pb-4 print:hidden">
          <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Mes anterior"
              onClick={() => setSelectedMonth(prevMonth)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="min-w-32 text-center text-sm font-semibold capitalize text-ink">
              {formatMonthLong(selectedMonth)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Mes siguiente"
              onClick={() => setSelectedMonth(nextMonth)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Printable header */}
      <div className="hidden print:block pb-4 border-b border-line break-after-avoid">
        <h2 className="text-2xl font-bold text-ink">Finanzia — Reporte Financiero</h2>
        <p className="text-sm text-ink-muted">
          Período: {viewMode === 'monthly' ? formatMonthLong(selectedMonth) : `Año ${selectedMonth.slice(0, 4)}`}
        </p>
        <p className="text-xs text-ink-muted">
          Generado el {printedOn} · Finanzas personales
        </p>
      </div>

      {/* Monthly View */}
      {viewMode === 'monthly' ? (
        <div className="space-y-6">
          <KpiGrid report={monthly} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            <TrendChart data={trend} />
            <CategoryChart data={categoryBreakdown} />
          </div>

          <BudgetVarianceTable rows={monthly?.rows ?? []} />
        </div>
      ) : (
        /* Annual View */
        <div className="space-y-6">
          <AnnualTable annual={annual} />
          <TrendChart data={trend} />
        </div>
      )}
    </section>
  );
}

