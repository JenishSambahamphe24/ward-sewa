import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import { m } from '@/paraglide/messages.js';
import { AssignStaffDialog } from './assign-staff-dialog.tsx';
import { StaffRow } from './staff-row.tsx';
import type { StaffMember } from './types.ts';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const secretary: StaffMember = {
  id: 4,
  phone: '9851000005',
  name: 'Gita Shrestha',
  role: 'ward_secretary',
  isActive: true,
  ward: { id: 2997, wardNo: 5 },
};

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

async function choose(label: string, option: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

const sentBody = () => JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('AssignStaffDialog', () => {
  async function fillAndSubmit() {
    await userEvent.click(screen.getByRole('button', { name: m.staff_assign() }));
    await userEvent.type(screen.getByLabelText(m.staff_name()), 'Bishnu Karki');
    await userEvent.type(screen.getByLabelText(m.staff_phone()), '९८५१०००००६');
    await choose(m.staff_role(), m.role_ward_chair());
    await choose(m.staff_ward(), m.staff_ward_n({ ward: '५' }));
    await userEvent.click(screen.getByRole('button', { name: m.staff_assign_submit() }));
  }

  it('sends the normalised phone, role and ward', async () => {
    fetchMock.mockResolvedValue(json(201, { staff: secretary }));
    renderWithProviders(<AssignStaffDialog wardCount={32} />);
    await fillAndSubmit();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/admin/staff');
    expect(sentBody()).toEqual({
      name: 'Bishnu Karki',
      phone: '9851000006',
      role: 'ward_chair',
      wardNo: 5,
    });
  });

  it('explains a ward that already has a chair', async () => {
    fetchMock.mockResolvedValue(
      json(409, {
        error: { code: 'CONFLICT', message: 'x', details: { reason: 'ward_has_chair' } },
      }),
    );
    renderWithProviders(<AssignStaffDialog wardCount={32} />);
    await fillAndSubmit();
    expect((await screen.findByRole('alert')).textContent).toBe(
      m.staff_error_ward_has_chair({ ward: '५' }),
    );
  });
});

describe('StaffRow', () => {
  it('sends only the fields that changed', async () => {
    fetchMock.mockResolvedValue(json(200, { staff: secretary }));
    renderWithProviders(<StaffRow member={secretary} wardCount={32} />);
    await userEvent.click(screen.getByRole('button', { name: m.staff_edit() }));
    await choose(m.staff_ward(), m.staff_ward_n({ ward: '७' }));
    await userEvent.click(screen.getByRole('button', { name: m.profile_save() }));
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/admin/staff/4');
    expect(sentBody()).toEqual({ wardNo: 7 });
  });

  it('asks before deactivating, then sends isActive false', async () => {
    fetchMock.mockResolvedValue(json(200, { staff: { ...secretary, isActive: false } }));
    renderWithProviders(<StaffRow member={secretary} wardCount={32} />);
    await userEvent.click(screen.getByRole('button', { name: m.staff_deactivate() }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(m.staff_deactivate_title({ name: 'Gita Shrestha' }))).toBeTruthy();

    const buttons = screen.getAllByRole('button', { name: m.staff_deactivate() });
    await userEvent.click(buttons[buttons.length - 1] as HTMLElement);
    expect(sentBody()).toEqual({ isActive: false });
  });
});
