import { Moon } from 'lucide-react';
import { useId } from 'react';
import { m } from '@/paraglide/messages.js';
import { useTheme } from './theme-provider.tsx';
import { Switch } from './ui/switch.tsx';

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Moon className="size-4 text-muted-foreground" aria-hidden />
      <label htmlFor={id} className="sr-only">
        {m.theme_dark()}
      </label>
      <Switch
        id={id}
        checked={theme === 'dark'}
        onCheckedChange={(dark) => setTheme(dark ? 'dark' : 'light')}
      />
    </div>
  );
}
