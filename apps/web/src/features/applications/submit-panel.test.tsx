import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { SubmitPanel } from './submit-panel.tsx';
import type { Application, ServiceType } from './types.ts';

const serviceType: ServiceType = {
  id: 1,
  code: 'residence',
  nameEn: 'Residence verification',
  nameNe: 'बसोबास प्रमाणित',
  fee: '100.00',
  requiredDocuments: [{ code: 'citizenship', nameEn: 'Citizenship', nameNe: 'नागरिकता' }],
  formFields: [],
};
const application = { id: 7, status: 'draft', version: 3, formData: {} } as unknown as Application;
const citizenship = { id: 1, documentCode: 'citizenship' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SubmitPanel application={application} serviceType={serviceType} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('SubmitPanel', () => {
  it('keeps Submit disabled and names the missing document', async () => {
    fetchMock.mockResolvedValue(json(200, { documents: [] }));
    renderPanel();
    expect(await screen.findByText(m.detail_missing_document({ name: 'नागरिकता' }))).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: m.detail_submit() }).disabled,
    ).toBe(true);
  });

  it('sends the version it saw and explains a 409 from a newer edit', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/documents')
          ? json(200, { documents: [citizenship] })
          : json(409, { error: { code: 'CONFLICT', message: 'stale' } }),
      ),
    );
    renderPanel();
    await screen.findByText(m.detail_ready_to_submit());
    await userEvent.click(screen.getByRole('button', { name: m.detail_submit() }));

    expect((await screen.findByRole('alert')).textContent).toBe(m.detail_conflict());
    const submitCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/submit'));
    expect(JSON.parse(String((submitCall?.[1] as RequestInit).body))).toEqual({ version: 3 });
  });
});
