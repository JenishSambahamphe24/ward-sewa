import { m } from '@/paraglide/messages.js';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import { Button } from './ui/button.tsx';

export function LanguageSwitch() {
  return (
    <Button variant="ghost" size="sm" onClick={() => setLocale(getLocale() === 'ne' ? 'en' : 'ne')}>
      {m.language_switch()}
    </Button>
  );
}
