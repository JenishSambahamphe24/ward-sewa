import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { m } from '@/paraglide/messages.js';
import { VerificationCodeHelper } from './verification-code.helper.ts';

interface VerifyFormProps {
  initialCode?: string;
}

export function VerifyForm({ initialCode = '' }: VerifyFormProps) {
  const id = useId();
  const navigate = useNavigate();
  const [input, setInput] = useState(initialCode);
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = VerificationCodeHelper.normalize(input);
    if (!VerificationCodeHelper.isValid(code)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void navigate({ to: '/verify/$code', params: { code } });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5" noValidate>
      <Label htmlFor={id}>{m.verify_code_label()}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={input}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="JVXWR6WF4T"
          aria-invalid={invalid}
          className="font-mono tracking-wider uppercase"
          onChange={(event) => setInput(event.target.value)}
        />
        <Button type="submit">
          <Search />
          {m.verify_submit()}
        </Button>
      </div>
      {invalid && <p className="text-sm text-danger">{m.verify_code_invalid()}</p>}
    </form>
  );
}
