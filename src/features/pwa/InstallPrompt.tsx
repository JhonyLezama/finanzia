import { Download, X } from 'lucide-react';
import { useInstallPrompt } from './useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Instalar Finanzia"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius-card)] border border-line-strong bg-surface p-3 shadow-pop sm:bottom-5 print:hidden"
    >
      <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 text-sm text-ink">
        Instalá Finanzia para abrirla sin conexión desde tu pantalla de inicio.
      </p>
      <button
        type="button"
        onClick={() => void promptInstall()}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-3 text-sm font-medium text-primary-ink"
      >
        Instalar
      </button>
      <button
        type="button"
        aria-label="Ahora no"
        onClick={dismiss}
        className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
