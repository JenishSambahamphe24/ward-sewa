import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import type { Application } from '@/features/applications/types.ts';
import type { Role } from '@/features/auth/session.ts';
import { m } from '@/paraglide/messages.js';
import { ReviewActions } from './review-actions.tsx';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

function renderActions(status: Application['status'], role: Role) {
  const application = { id: 9, status, version: 4 } as Application;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ReviewActions application={application} role={role} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const lastButton = (name: string) => screen.getAllByRole('button', { name }).at(-1) as HTMLElement;
const call = (index = 0) => fetchMock.mock.calls[index] as [string, RequestInit];

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('ReviewActions', () => {
  it('shows the chair Approve, but not the secretary', () => {
    renderActions('under_review', 'ward_secretary');
    expect(screen.queryByRole('button', { name: m.review_approve() })).toBeNull();
    expect(screen.getByRole('button', { name: m.review_reject() })).toBeTruthy();
  });

  it('needs a note to reject, then sends it with the version it saw', async () => {
    fetchMock.mockResolvedValue(json(200, { application: { id: 9, status: 'rejected' } }));
    renderActions('under_review', 'ward_chair');
    await userEvent.click(screen.getByRole('button', { name: m.review_reject() }));
    expect((lastButton(m.review_reject()) as HTMLButtonElement).disabled).toBe(true);

    await userEvent.type(screen.getByLabelText(m.review_note_required()), 'Photo unreadable');
    await userEvent.click(lastButton(m.review_reject()));
    const [url, init] = call();
    expect(url).toBe('/api/staff/applications/9/transition');
    expect(JSON.parse(String(init.body))).toEqual({
      to: 'rejected',
      version: 4,
      note: 'Photo unreadable',
    });
  });

  it('issues through its own endpoint', async () => {
    fetchMock.mockResolvedValue(json(201, { letter: { letterNo: '1' } }));
    renderActions('approved', 'ward_secretary');
    await userEvent.click(screen.getByRole('button', { name: m.review_issue() }));
    await userEvent.click(lastButton(m.review_issue()));
    const [url, init] = call();
    expect(url).toBe('/api/staff/applications/9/issue');
    expect(JSON.parse(String(init.body))).toEqual({ version: 4 });
  });

  it('explains a 409 when a colleague acted first', async () => {
    fetchMock.mockResolvedValue(json(409, { error: { code: 'CONFLICT', message: 'stale' } }));
    renderActions('submitted', 'ward_secretary');
    await userEvent.click(screen.getByRole('button', { name: m.review_start() }));
    await userEvent.click(lastButton(m.review_start()));
    expect((await screen.findByRole('alert')).textContent).toBe(m.review_conflict());
  });
});
