import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, () => true);

  if (online) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-gold/40 bg-gold/15 px-4 py-2 text-sm text-gold-ink print:hidden"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      Sin conexión. Tus datos siguen acá.
    </div>
  );
}
