import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { Pager } from './pager.tsx';

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });

describe('Pager', () => {
  it('hides itself when everything fits on one page', () => {
    const { container } = render(
      <Pager page={1} pageSize={20} total={20} onPageChange={vi.fn()} />,
    );
    expect(container.textContent).toBe('');
  });

  it('disables Previous on the first page and moves forward', async () => {
    const onPageChange = vi.fn();
    render(<Pager page={1} pageSize={20} total={45} onPageChange={onPageChange} />);
    expect(button(m.action_previous()).disabled).toBe(true);
    expect(screen.getByText(m.queue_page({ page: '१', pages: '३', total: '४५' }))).toBeTruthy();
    await userEvent.click(button(m.action_next()));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Next on the last page', () => {
    render(<Pager page={3} pageSize={20} total={45} onPageChange={vi.fn()} />);
    expect(button(m.action_next()).disabled).toBe(true);
  });
});
