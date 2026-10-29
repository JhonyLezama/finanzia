import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export interface CopyMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function CopyMonthDialog({ open, onOpenChange, onConfirm }: CopyMonthDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al copiar el presupuesto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Copiar mes anterior"
      description="Se copiarán los presupuestos variables y el objetivo de ahorro del mes anterior. Los fijos se generan a partir de las reglas recurrentes."
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
            {error}
          </div>
        ) : null}

        <p className="text-sm text-ink-muted">
          ¿Deseas sobreescribir las metas variables de este mes con las del mes anterior?
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Copiando…' : 'Copiar mes anterior'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
