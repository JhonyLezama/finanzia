import { CircleAlert, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la interfaz', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
          <CircleAlert className="size-10 text-red" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">Algo salió mal</h1>
          <p className="text-ink-muted">
            La pantalla no pudo cargarse. Tus datos siguen guardados en este dispositivo.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Recargar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteError() {
  const error = useRouteError();
  console.error('Error de ruta', error);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
      <CircleAlert className="size-10 text-red" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">No pudimos abrir esta pantalla</h1>
      <p className="text-ink-muted">
        Volvé al inicio y probá de nuevo. Si el problema continúa, recargá la aplicación.
      </p>
      <Button onClick={() => window.location.assign('/')}>Volver al inicio</Button>
    </div>
  );
}
