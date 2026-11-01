import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';

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
      className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-2.5 rounded-[var(--radius-card)] border border-l-4 border-line-strong border-l-gold bg-surface py-2 pl-3 pr-2 shadow-pop sm:bottom-5 print:hidden"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold text-[#102a24]"
      >
        <RefreshCw className="size-4" strokeWidth={2.5} />
      </span>
      <p className="min-w-0 flex-1 leading-tight">
        <span className="block text-xs font-semibold text-ink">Nueva versión</span>
        <span className="block text-[11px] text-ink-muted">Actualizá la app.</span>
      </p>
      <Button
        size="sm"
        className="shrink-0 px-2.5 text-xs font-semibold"
        onClick={() => void updateServiceWorker(true)}
      >
        Actualizar
      </Button>
      <button
        type="button"
        aria-label="Descartar aviso"
        onClick={() => setDismissed(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
