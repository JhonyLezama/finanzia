import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { FloatingCalculator } from '@/features/calculator/FloatingCalculator';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function AppShell() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink"
      >
        Saltar al contenido
      </a>

      {isDesktop ? <Sidebar /> : null}

      <div className={isDesktop ? 'lg:pl-60' : 'pb-20'}>
        <Header />
        <OfflineBanner />
        <main
          id="contenido"
          className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>

      {!isDesktop ? (
        <Link
          to="/movimientos"
          aria-label="Registrar movimiento"
          className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-ink shadow-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
      ) : null}

      {isDesktop ? null : <BottomNav />}
      <FloatingCalculator />
    </div>
  );
}
