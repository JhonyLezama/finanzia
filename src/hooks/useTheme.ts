import { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'alcancia-theme';

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }
  return 'system';
}

function systemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export function useThemeState(): ThemeContextValue {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredPreference);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);
  const resolvedTheme: ResolvedTheme = theme === 'system' ? system : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The theme still applies for this session.
    }
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(query.matches ? 'dark' : 'light');
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return { theme, resolvedTheme, setTheme: setThemeState };
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <Providers>.');
  }
  return context;
}
