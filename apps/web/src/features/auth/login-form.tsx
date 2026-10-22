import { NumeralHelper } from '@ward-sewa/nepal-utils';
import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { ApiClient } from '@/lib/api-client.ts';
import { cn } from '@/lib/cn.ts';
import { m } from '@/paraglide/messages.js';
import { AuthErrorHelper } from './auth-error.helper.ts';
import type { User } from './session.ts';

const PHONE = /^9[678]\d{8}$/;

interface FieldMessageProps {
  id: string;
  error: string | null;
  children: ReactNode;
}

// Error and hint share one fixed-height slot, so showing an error never resizes the card.
function FieldMessage({ id, error, children }: FieldMessageProps) {
  return (
    <p
      id={id}
      role={error === null ? undefined : 'alert'}
      className={cn('min-h-10 text-sm leading-5', {
        'font-medium text-danger': error !== null,
        'text-muted-foreground': error === null,
      })}
    >
      {error ?? children}
    </p>
  );
}

interface StepsProps {
  step: 1 | 2;
}

function Steps({ step }: StepsProps) {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden>
      <span className="h-1.5 w-8 rounded-full bg-primary" />
      <span
        className={cn('h-1.5 w-8 rounded-full transition-colors', {
          'bg-primary': step === 2,
          'bg-border': step === 1,
        })}
      />
    </div>
  );
}

interface LoginFormProps {
  onLoggedIn: (user: User) => void;
}

export function LoginForm({ onLoggedIn }: LoginFormProps) {
  const phoneId = useId();
  const codeId = useId();
  const [phoneInput, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phone = NumeralHelper.toEnglish(phoneInput).replace(/\D/g, '');

  const requestCode = useMutation({
    mutationFn: () => ApiClient.post('/auth/otp/request', { body: { phone } }),
  });
  const verify = useMutation({
    mutationFn: () =>
      ApiClient.post<{ token: string; user: User }>('/auth/otp/verify', { body: { phone, code } }),
    onSuccess: ({ token, user }) => {
      ApiClient.setToken(token);
      onLoggedIn(user);
    },
  });

  const submitPhone = (event: FormEvent) => {
    event.preventDefault();
    if (!PHONE.test(phone)) {
      setPhoneError(m.login_phone_invalid());
      return;
    }
    setPhoneError(null);
    requestCode.mutate();
  };
  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    verify.mutate();
  };
  const changeNumber = () => {
    requestCode.reset();
    verify.reset();
    setCode('');
  };

  if (!requestCode.isSuccess) {
    const error =
      phoneError ?? (requestCode.isError ? AuthErrorHelper.message(requestCode.error) : null);
    return (
      <form onSubmit={submitPhone} className="flex flex-col gap-4" noValidate>
        <Steps step={1} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={phoneId}>{m.login_phone_label()}</Label>
          <Input
            id={phoneId}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98XXXXXXXX"
            className="h-11 bg-surface/70 text-lg tracking-wide"
            value={phoneInput}
            onChange={(event) => {
              setPhoneInput(event.target.value);
              setPhoneError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={`${phoneId}-message`}
          />
          <FieldMessage id={`${phoneId}-message`} error={error}>
            {m.login_phone_hint()}
          </FieldMessage>
        </div>
        <Button type="submit" size="lg" className="h-11 shadow-md" disabled={requestCode.isPending}>
          {m.login_send_code()}
        </Button>
      </form>
    );
  }

  const error = verify.isError ? AuthErrorHelper.message(verify.error) : null;
  return (
    <form onSubmit={submitCode} className="flex flex-col gap-4" noValidate>
      <Steps step={2} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={codeId}>{m.login_code_label()}</Label>
        <Input
          id={codeId}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="h-11 bg-surface/70 text-center text-xl tracking-[0.6em]"
          value={code}
          onChange={(event) => {
            setCode(NumeralHelper.toEnglish(event.target.value).replace(/\D/g, ''));
            verify.reset();
          }}
          aria-invalid={error !== null}
          aria-describedby={`${codeId}-message`}
        />
        <FieldMessage id={`${codeId}-message`} error={error}>
          {m.login_code_sent({ phone: NumeralHelper.toNepali(phone) })}
        </FieldMessage>
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 shadow-md"
        disabled={code.length !== 6 || verify.isPending}
      >
        {m.login_verify()}
      </Button>
      <div className="flex justify-between">
        <Button type="button" variant="link" className="h-auto px-0" onClick={changeNumber}>
          {m.login_change_number()}
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-auto px-0"
          disabled={requestCode.isPending}
          onClick={() => requestCode.mutate()}
        >
          {m.login_resend()}
        </Button>
      </div>
    </form>
  );
}
