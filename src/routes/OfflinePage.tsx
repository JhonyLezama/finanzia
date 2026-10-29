import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <WifiOff className="size-10 text-gold" aria-hidden="true" />
      <h1 className="text-3xl font-semibold text-ink">Sin conexión</h1>
      <p className="text-ink-muted">
        Alcancía funciona sin internet. Tus datos siguen guardados en este dispositivo.
      </p>
    </main>
  );
}
