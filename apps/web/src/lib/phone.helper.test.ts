import { describe, expect, it } from 'vitest';
import { PhoneHelper } from './phone.helper.ts';

describe('PhoneHelper', () => {
  it('turns Devanagari digits and separators into a plain number', () => {
    expect(PhoneHelper.normalize('९८४१-००० ०१०')).toBe('9841000010');
  });

  it.each([
    ['9841000010', true],
    ['9741000010', true],
    ['9541000010', false],
    ['984100001', false],
  ])('%s → %s', (phone, expected) => {
    expect(PhoneHelper.isValid(phone)).toBe(expected);
  });
});
