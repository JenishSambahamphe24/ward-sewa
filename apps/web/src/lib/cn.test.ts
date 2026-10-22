import { describe, expect, it } from 'vitest';
import { cn } from './cn.ts';

describe('cn', () => {
  it('joins classes and drops falsy ones', () => {
    const disabled = false;
    expect(cn('rounded px-3', disabled && 'opacity-50', { 'bg-primary': true })).toBe(
      'rounded px-3 bg-primary',
    );
  });

  it('lets a later Tailwind class override an earlier conflicting one', () => {
    expect(cn('px-3 bg-primary', 'px-6')).toBe('bg-primary px-6');
  });
});
