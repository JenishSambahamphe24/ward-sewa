import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { VerifyResult } from './verify-result.tsx';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

function renderResult(code: string) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <VerifyResult code={code} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('VerifyResult', () => {
  it('shows who the letter was issued to and by whom', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        valid: true,
        letterNo: '2083/84-5-12',
        issuedDateBs: '2083-07-08',
        applicantName: 'Sita Kumari Rai',
        serviceType: { code: 'residence', nameEn: 'Residence', nameNe: 'बसोबास प्रमाणित' },
        issuedBy: { localLevel: 'Kathmandu', wardNo: 5 },
      }),
    );
    renderResult('JVXWR6WF4T');
    expect(await screen.findByText(m.verify_valid_title())).toBeTruthy();
    expect(screen.getByText('Sita Kumari Rai')).toBeTruthy();
    expect(
      screen.getByText(m.verify_issued_by_value({ localLevel: 'Kathmandu', ward: '५' })),
    ).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/verify/JVXWR6WF4T');
  });

  it('says plainly when no letter has the code, without retrying', async () => {
    fetchMock.mockResolvedValue(json(404, { error: { code: 'NOT_FOUND', message: 'none' } }));
    renderResult('JVXWR6WF4T');
    expect(await screen.findByText(m.verify_not_found_title())).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
