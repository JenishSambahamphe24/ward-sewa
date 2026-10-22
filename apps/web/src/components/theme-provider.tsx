import { createContext, use, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn.ts';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  portalContainer: HTMLElement | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'ward-sewa-theme';

function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Portals (modals) render into a container inside the themed wrapper, so dark mode reaches
// them without touching <html>.
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext value={{ theme, setTheme, portalContainer }}>
      <div className={cn('min-h-dvh bg-background text-foreground', { dark: theme === 'dark' })}>
        {children}
        <div ref={setPortalContainer} />
      </div>
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
