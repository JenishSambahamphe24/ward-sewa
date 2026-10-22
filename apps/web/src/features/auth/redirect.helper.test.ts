import { describe, expect, it } from 'vitest';
import { RedirectHelper } from './redirect.helper.ts';

describe('RedirectHelper.afterLogin', () => {
  it('returns to the page the user asked for', () => {
    expect(RedirectHelper.afterLogin('citizen', '/applications/42')).toBe('/applications/42');
  });

  it('falls back to the role home', () => {
    expect(RedirectHelper.afterLogin('ward_chair', undefined)).toBe('/staff');
  });

  it.each(['https://evil.example', '//evil.example', 'javascript:alert(1)'])(
    'refuses %s (open redirect)',
    (target) => {
      expect(RedirectHelper.afterLogin('citizen', target)).toBe('/applications');
    },
  );
});
