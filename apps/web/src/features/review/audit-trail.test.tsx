import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { AuditTrail } from './audit-trail.tsx';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('AuditTrail', () => {
  it('lists who did what, with the reviewer’s note', async () => {
    const events = [
      {
        id: 7,
        type: 'application.rejected',
        actor: { userId: 8, role: 'ward_chair' },
        changes: { status: { from: 'under_review', to: 'rejected' } },
        note: 'Photo unreadable',
        at: '2026-10-25T06:00:00.000Z',
      },
    ];
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ events }), { status: 200 }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuditTrail applicationId={3} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(m.audit_rejected())).toBeTruthy();
    expect(screen.getByText('“Photo unreadable”')).toBeTruthy();
    expect(
      screen.getByText(new RegExp(m.audit_actor({ role: m.role_ward_chair(), id: '८' }))),
    ).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/applications/3/audit');
  });
});
