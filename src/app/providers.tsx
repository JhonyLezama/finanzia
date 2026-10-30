import type { ReactNode } from 'react';
import { InstallPrompt } from '@/features/pwa/InstallPrompt';
import { UpdatePrompt } from '@/features/pwa/UpdatePrompt';
import { ThemeContext, useThemeState } from '@/hooks/useTheme';

export function Providers({ children }: { children: ReactNode }) {
  const theme = useThemeState();

  return (
    <ThemeContext.Provider value={theme}>
      {children}
      <UpdatePrompt />
      <InstallPrompt />
    </ThemeContext.Provider>
  );
}
