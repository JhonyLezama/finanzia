import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { MonthKey, PlanItem } from '@/domain/models';

export interface UpcomingCommitmentsProps {
  items: PlanItem[];
  month: MonthKey;
  isClosed: boolean;
  onPay: (item: PlanItem) => void;
}

export function UpcomingCommitments({
  items,
  month,
  isClosed,
  onPay,
}: UpcomingCommitmentsProps) {
  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Próximos compromisos
          </h2>
          <p className="text-xs text-ink-muted">Fijos pendientes de este mes.</p>
        </div>
        <Link
          to={`/presupuesto?mes=${month}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver presupuesto
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-2 text-sm text-ink-muted">
          No hay compromisos pendientes este mes.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-ink">{item.name}</p>
                <p className="text-xs text-ink-muted">
                  Vence el {formatDateShort(item.dueDate)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-ink">
                  <Money cents={item.amountCents} />
                </p>
                {isClosed ? (
                  <Chip tone="neutral">Pendiente</Chip>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Pagar ${item.name}`}
                    onClick={() => onPay(item)}
                  >
                    Pagar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
