import { isNotFound } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { RouteParamHelper } from './route-param.helper.ts';

describe('RouteParamHelper.id', () => {
  it('reads a positive integer id', () => {
    expect(RouteParamHelper.id('42')).toBe(42);
  });

  it.each(['abc', '0', '-3', '1.5'])('treats "%s" as a page that does not exist', (raw) => {
    let thrown: unknown;
    try {
      RouteParamHelper.id(raw);
    } catch (error) {
      thrown = error;
    }
    expect(isNotFound(thrown)).toBe(true);
  });
});
