import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.tsx';

describe('Button', () => {
  it('uses theme tokens for its variants', () => {
    render(<Button variant="danger">Reject</Button>);
    expect(screen.getByRole('button', { name: 'Reject' }).className).toContain('bg-danger');
  });

  it('can render as its child element', () => {
    render(
      <Button asChild>
        <a href="/apply">Apply</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Apply' }).className).toContain('bg-primary');
  });
});
