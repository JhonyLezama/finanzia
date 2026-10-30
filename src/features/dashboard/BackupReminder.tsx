import { HardDriveDownload } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';

export interface BackupReminderProps {
  onDismiss: () => void | Promise<void>;
}

export function BackupReminder({ onDismiss }: BackupReminderProps) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-gold/40 bg-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <HardDriveDownload className="mt-0.5 size-5 shrink-0 text-gold-ink" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-ink">
            Pasaron más de 30 días sin backup
          </p>
          <p className="text-xs text-ink-muted">
            Exportá tus datos para no perderlos.{' '}
            <Link to="/ajustes" className="font-medium text-primary hover:underline">
              Ir a Ajustes
            </Link>
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        aria-label="Descartar recordatorio"
        onClick={() => void onDismiss()}
      >
        Descartar
      </Button>
    </div>
  );
}
