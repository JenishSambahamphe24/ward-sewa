import { describe, expect, it } from 'vitest';
import { VerificationCodeHelper } from './verification-code.helper.ts';

describe('VerificationCodeHelper', () => {
  it('accepts a code typed in lower case with spaces or dashes', () => {
    expect(VerificationCodeHelper.normalize(' jvxwr-6wf4t ')).toBe('JVXWR6WF4T');
  });

  it.each([
    ['JVXWR6WF4T', true],
    ['JVXWR6WF4', false],
    ['JVXWR6WF4I', false],
    ['JVXWR6WF4U', false],
  ])('%s → %s', (code, expected) => {
    expect(VerificationCodeHelper.isValid(code)).toBe(expected);
  });
});
