import { describe, expect, it } from 'vitest';
import { MoneyHelper } from './money.helper.ts';

describe('MoneyHelper.rupees (Nepali locale)', () => {
  it.each([
    ['100.00', 'रु. १००'],
    ['1500.50', 'रु. १,५००.५०'],
    ['100000.00', 'रु. १,००,०००'],
    ['12345678.00', 'रु. १,२३,४५,६७८'],
  ])('%s → %s', (amount, expected) => {
    expect(MoneyHelper.rupees(amount)).toBe(expected);
  });
});
