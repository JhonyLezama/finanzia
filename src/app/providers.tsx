import type { ReactNode } from 'react';
import { ThemeContext, useThemeState } from '@/hooks/useTheme';

export function Providers({ children }: { children: ReactNode }) {
  const theme = useThemeState();

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
