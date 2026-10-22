import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { NewApplicationForm } from './new-application-form.tsx';

const residence = {
  id: 1,
  code: 'residence',
  nameEn: 'Residence verification',
  nameNe: 'बसोबास प्रमाणित',
  fee: '100.00',
  requiredDocuments: [{ code: 'citizenship', nameEn: 'Citizenship', nameNe: 'नागरिकता' }],
  formFields: [
    {
      key: 'residingSince',
      labelEn: 'Since',
      labelNe: 'बसोबास सुरु मिति',
      type: 'date_bs',
      required: true,
    },
  ],
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

function renderForm(onCreated = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <NewApplicationForm onCreated={onCreated} />
    </QueryClientProvider>,
  );
  return onCreated;
}

async function chooseKathmanduWard5() {
  await userEvent.selectOptions(screen.getByLabelText(m.address_province()), 'NP03');
  await userEvent.selectOptions(screen.getByLabelText(m.address_district()), 'NP0327');
  await userEvent.selectOptions(screen.getByLabelText(m.address_local_level()), 'NP0327101');
  await userEvent.selectOptions(screen.getByLabelText(m.address_ward()), '5');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('NewApplicationForm', () => {
  it('clears lower levels when a higher one changes', async () => {
    fetchMock.mockResolvedValue(json(200, { serviceTypes: [] }));
    renderForm();
    await chooseKathmanduWard5();
    await userEvent.selectOptions(screen.getByLabelText(m.address_province()), 'NP01');
    expect((screen.getByLabelText(m.address_district()) as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText(m.address_ward()) as HTMLSelectElement).disabled).toBe(true);
  });

  it('saves a draft with the right body and reuses the idempotency key on retry', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { serviceTypes: [residence] }))
      .mockResolvedValueOnce(json(503, { error: { code: 'INTERNAL_ERROR', message: 'x' } }))
      .mockResolvedValueOnce(json(201, { application: { id: 42 } }));
    const onCreated = renderForm();

    await chooseKathmanduWard5();
    await userEvent.click(await screen.findByRole('radio', { name: /बसोबास प्रमाणित/ }));
    await userEvent.type(screen.getByLabelText(/बसोबास सुरु मिति/), '२०७५-०३-१५');
    await userEvent.type(screen.getByLabelText(new RegExp(m.address_tole())), 'Baneshwor');

    const save = screen.getByRole('button', { name: m.apply_save_draft() });
    await userEvent.click(save);
    expect((await screen.findByRole('alert')).textContent).toContain(m.error_generic());
    await userEvent.click(save);
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 42 }));

    const [first, retry] = fetchMock.mock.calls.slice(1) as [
      [string, RequestInit],
      [string, RequestInit],
    ];
    expect(first[0]).toBe('/api/applications');
    expect(JSON.parse(first[1].body as string)).toEqual({
      serviceTypeId: 1,
      localLevelCode: 'NP0327101',
      wardNo: 5,
      tole: 'Baneshwor',
      formData: { residingSince: '२०७५-०३-१५' },
    });
    const key = (init: RequestInit) => (init.headers as Record<string, string>)['Idempotency-Key'];
    expect(key(first[1])).toMatch(/^[0-9a-f-]{36}$/);
    expect(key(retry[1])).toBe(key(first[1]));
  });

  it('shows an impossible date before sending anything', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { serviceTypes: [residence] }));
    renderForm();
    await chooseKathmanduWard5();
    await userEvent.click(await screen.findByRole('radio', { name: /बसोबास प्रमाणित/ }));
    await userEvent.type(screen.getByLabelText(/बसोबास सुरु मिति/), '2083-01-32');
    expect((await screen.findByRole('alert')).textContent).toContain(m.field_bs_date_invalid());
    expect(
      (screen.getByRole('button', { name: m.apply_save_draft() }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
