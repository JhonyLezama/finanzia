import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { PlanItem } from '@/domain/models';

export interface IncomeSectionProps {
  items: PlanItem[];
  isClosed?: boolean;
  onReceive: (item: PlanItem) => void;
}

export function IncomeSection({ items, isClosed = false, onReceive }: IncomeSectionProps) {
  const totalPlanned = items.reduce((sum, item) => sum + item.amountCents, 0);
  const totalReceived = items
    .filter((item) => item.status === 'settled')
    .reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Ingresos previstos</h2>
          <p className="text-xs text-ink-muted">Sueldo y otros ingresos esperados del mes</p>
        </div>
        <div className="text-sm">
          <span className="text-ink-muted">Recibido: </span>
          <span className="font-semibold text-primary">
            <Money cents={totalReceived} />
          </span>
          <span className="text-ink-muted"> de </span>
          <span className="font-medium text-ink">
            <Money cents={totalPlanned} />
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted py-2">No hay ingresos previstos para este mes.</p>
      ) : (
        <div className="divide-y divide-line">
          {items.map((item) => {
            const isSettled = item.status === 'settled';

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 gap-3 first:pt-1 last:pb-1"
              >
                <div>
                  <p className="font-medium text-sm text-ink">{item.name}</p>
                  <p className="text-xs text-ink-muted">
                    {item.dueDate ? `Esperado el ${formatDateShort(item.dueDate)}` : 'Este mes'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-sm text-ink">
                      <Money cents={item.amountCents} />
                    </p>
                  </div>

                  {isSettled ? (
                    <Chip tone="positive" className="gap-1">
                      <CheckCircle2 className="size-3" />
                      Recibido
                    </Chip>
                  ) : !isClosed ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`Recibir ${item.name}`}
                      onClick={() => onReceive(item)}
                    >
                      Recibir
                    </Button>
                  ) : (
                    <Chip tone="neutral" className="gap-1">
                      <Clock className="size-3" />
                      Pendiente
                    </Chip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
