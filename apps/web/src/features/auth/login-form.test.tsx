import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { LoginForm } from './login-form.tsx';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function renderForm(onLoggedIn = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LoginForm onLoggedIn={onLoggedIn} />
    </QueryClientProvider>,
  );
  return onLoggedIn;
}

const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('LoginForm', () => {
  it('catches an invalid number before calling the API', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(m.login_phone_label()), '12345');
    await userEvent.click(screen.getByRole('button', { name: m.login_send_code() }));
    expect(screen.getByRole('alert').textContent).toContain(m.login_phone_invalid());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts Devanagari digits and logs in with the code', async () => {
    fetchMock
      .mockResolvedValueOnce(json(202, { expiresInSeconds: 300 }))
      .mockResolvedValueOnce(json(200, { token: 'tok', user: { id: 1, role: 'citizen' } }));
    const onLoggedIn = renderForm();

    await userEvent.type(screen.getByLabelText(m.login_phone_label()), '९८४१२३४५६७');
    await userEvent.click(screen.getByRole('button', { name: m.login_send_code() }));
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({ phone: '9841234567' });

    await userEvent.type(await screen.findByLabelText(m.login_code_label()), '123456');
    await userEvent.click(screen.getByRole('button', { name: m.login_verify() }));
    await vi.waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith({ id: 1, role: 'citizen' }));
    expect(localStorage.getItem('ward-sewa-session')).toBe('tok');
  });

  it('explains a rate limit in minutes', async () => {
    fetchMock.mockResolvedValueOnce(
      json(429, { error: { code: 'RATE_LIMITED', message: 'x' } }, { 'Retry-After': '600' }),
    );
    renderForm();
    await userEvent.type(screen.getByLabelText(m.login_phone_label()), '9841234567');
    await userEvent.click(screen.getByRole('button', { name: m.login_send_code() }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      m.error_rate_limited({ minutes: 10 }),
    );
  });

  it('reports a wrong code without losing the form', async () => {
    fetchMock
      .mockResolvedValueOnce(json(202, { expiresInSeconds: 300 }))
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }));
    renderForm();
    await userEvent.type(screen.getByLabelText(m.login_phone_label()), '9841234567');
    await userEvent.click(screen.getByRole('button', { name: m.login_send_code() }));
    await userEvent.type(await screen.findByLabelText(m.login_code_label()), '000000');
    await userEvent.click(screen.getByRole('button', { name: m.login_verify() }));
    expect((await screen.findByRole('alert')).textContent).toContain(m.login_code_invalid());
    expect(screen.getByLabelText(m.login_code_label())).toBeTruthy();
  });
});
