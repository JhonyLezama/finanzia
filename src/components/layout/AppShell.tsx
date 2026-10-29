import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
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

      {isDesktop ? null : <BottomNav />}
    </div>
  );
}
