import { Download, RefreshCw, Wifi, WifiOff, ExternalLink, ShieldCheck, FileText, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import type { StorageState } from '@/hooks/useSettings';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaSectionProps {
  storage: StorageState;
}

export function PwaSection({ storage }: PwaSectionProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = async () => {
    if (!installEvent) {
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    setInstallEvent(null);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Aplicación y Sistema</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Finanzia funciona sin conexión y se puede instalar como app en Android, iOS y escritorio.
          </p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
            <dt className="text-xs text-ink-muted">Conexión</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 font-medium text-ink">
              {online ? (
                <Wifi className="size-4 text-primary" aria-hidden="true" />
              ) : (
                <WifiOff className="size-4 text-red" aria-hidden="true" />
              )}
              {online ? 'En línea' : 'Sin conexión'}
            </dd>
          </div>
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
            <dt className="text-xs text-ink-muted">Instalación</dt>
            <dd className="mt-1 font-medium text-ink">
              <Chip tone={installed ? 'positive' : 'neutral'}>
                {installed ? 'Instalada' : installEvent ? 'Disponible' : 'Desde el menú del navegador'}
              </Chip>
            </dd>
          </div>
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
            <dt className="text-xs text-ink-muted">Datos persistentes</dt>
            <dd className="mt-1 font-medium text-ink">
              {storage.persisted ? 'Sí' : 'No'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void install()} disabled={!installEvent}>
            <Download className="mr-1.5 size-4" aria-hidden="true" />
            Instalar app
          </Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-1.5 size-4" aria-hidden="true" />
            Buscar actualización
          </Button>
        </div>

        <p className="text-xs text-ink-muted">
          Si el botón de instalar está deshabilitado, usá “Agregar a pantalla de inicio” en el menú del
          navegador. Las actualizaciones se avisan solas cuando hay una versión nueva.
        </p>
      </Card>

      {/* Información sobre el desarrollador y transparencia */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Transparencia y Legal</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Conoce quién está detrás del proyecto, cómo se protegen tus datos y los términos de uso.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/acerca-de"
            className="flex flex-col justify-between rounded-[var(--radius-control)] border border-line bg-surface-2 p-3.5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 font-medium text-ink text-sm">
                <Info className="size-4 text-primary" />
                Acerca de Finanzia
              </span>
              <p className="text-xs text-ink-muted">
                Desarrollado por SysJoL. Conoce nuestra visión y contacto.
              </p>
            </div>
            <span className="mt-2 text-xs font-semibold text-primary">Ver detalles →</span>
          </Link>

          <Link
            to="/privacidad"
            className="flex flex-col justify-between rounded-[var(--radius-control)] border border-line bg-surface-2 p-3.5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 font-medium text-ink text-sm">
                <ShieldCheck className="size-4 text-primary" />
                Política de Privacidad
              </span>
              <p className="text-xs text-ink-muted">
                Por qué tus datos nunca salen de tu dispositivo y cómo cuidarlos.
              </p>
            </div>
            <span className="mt-2 text-xs font-semibold text-primary">Leer política →</span>
          </Link>

          <Link
            to="/terminos"
            className="flex flex-col justify-between rounded-[var(--radius-control)] border border-line bg-surface-2 p-3.5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 font-medium text-ink text-sm">
                <FileText className="size-4 text-primary" />
                Términos y Descargo
              </span>
              <p className="text-xs text-ink-muted">
                Aviso de responsabilidad financiera y condiciones de uso.
              </p>
            </div>
            <span className="mt-2 text-xs font-semibold text-primary">Leer términos →</span>
          </Link>
        </div>

        <div className="border-t border-line pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>Versión 0.1.0 • SysJoL Software</span>
          <a
            href="https://sysjol.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            https://sysjol.onrender.com/
            <ExternalLink className="size-3" />
          </a>
        </div>
      </Card>
    </div>
  );
}
