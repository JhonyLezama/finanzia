import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [dismissed, setDismissed] = useState(false);

  if (!needRefresh || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius-card)] border border-gold/50 bg-gold/15 p-3 text-gold-ink shadow-xl sm:bottom-5"
    >
      <RefreshCw className="size-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm">Hay una versión nueva de Finanzia lista para instalar.</p>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-3 text-sm font-medium text-primary-ink"
      >
        Actualizar
      </button>
      <button
        type="button"
        aria-label="Descartar aviso"
        onClick={() => setDismissed(true)}
        className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
