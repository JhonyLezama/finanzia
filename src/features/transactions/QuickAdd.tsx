import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface QuickAddProps {
  isClosed?: boolean;
  onOpen: () => void;
}

export function QuickAdd({ isClosed = false, onOpen }: QuickAddProps) {
  if (isClosed) {
    return (
      <div className="inline-flex items-center rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-muted">
        Mes cerrado
      </div>
    );
  }

  return (
    <Button variant="primary" onClick={onOpen}>
      <Plus className="mr-1.5 size-4" aria-hidden="true" />
      Nuevo movimiento
    </Button>
  );
}
