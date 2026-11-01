import { BarChart3, Table as TableIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface ChartTableProps {
  title: string;
  tableName: string;
  headers: string[];
  rows: (ReactNode)[][];
  children: ReactNode;
  footer?: ReactNode;
  defaultShowTable?: boolean;
  className?: string;
}

export function ChartTable({
  title,
  tableName,
  headers,
  rows,
  children,
  footer,
  defaultShowTable = false,
  className,
}: ChartTableProps) {
  const [showTable, setShowTable] = useState(defaultShowTable);

  return (
    <Card className={`p-4 sm:p-5 print:break-inside-avoid ${className ?? ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="font-display font-semibold text-lg text-ink">{title}</h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? 'Ver gráfico' : 'Ver tabla'}
          className="print:hidden"
        >
          {showTable ? (
            <>
              <BarChart3 className="size-4 mr-1.5" />
              Ver gráfico
            </>
          ) : (
            <>
              <TableIcon className="size-4 mr-1.5" />
              Ver tabla
            </>
          )}
        </Button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto print:overflow-visible">
          <table
            className="w-full text-left text-sm"
            aria-label={tableName}
          >
            <caption className="sr-only">{tableName}</caption>
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {headers.map((h, i) => (
                  <th key={i} scope="col" className="pb-2 px-3 first:pl-0 last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surface-2">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-3 first:pl-0 last:pr-0 text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footer ? <tfoot>{footer}</tfoot> : null}
          </table>
        </div>
      ) : (
        <div>
          {children}
        </div>
      )}
    </Card>
  );
}

