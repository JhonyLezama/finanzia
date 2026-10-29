import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export interface CloseMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isClosed?: boolean;
  onCloseMonth: () => Promise<void>;
  onReopenMonth: () => Promise<void>;
}

export function CloseMonthDialog({
  open,
  onOpenChange,
  isClosed = false,
  onCloseMonth,
  onReopenMonth,
}: CloseMonthDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isClosed) {
        await onReopenMonth();
      } else {
        await onCloseMonth();
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isClosed ? 'Reabrir mes' : 'Cerrar mes'}
      description={
        isClosed
          ? 'Reabrir este mes permitirá registrar nuevos movimientos y modificar presupuestos.'
          : 'Al cerrar el mes se crea un snapshot definitivo y se bloquea cualquier modificación.'
      }
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
            {error}
          </div>
        ) : null}

        <p className="text-sm text-ink-muted">
          {isClosed
            ? '¿Confirmás que querés reabrir este mes?'
            : 'Asegurate de haber liquidado u omitido todos los compromisos fijos antes de cerrar.'}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isClosed ? 'secondary' : 'danger'}
            onClick={handleAction}
            disabled={busy}
          >
            {busy ? 'Procesando…' : isClosed ? 'Confirmar reapertura' : 'Confirmar cierre'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
