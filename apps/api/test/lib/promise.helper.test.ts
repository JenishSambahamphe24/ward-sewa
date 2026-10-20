import { describe, expect, it } from 'vitest';
import { PromiseHelper } from '../../src/lib/promise.helper.ts';

describe('PromiseHelper.withTimeout', () => {
  it('resolves with the value when the promise settles in time', async () => {
    await expect(PromiseHelper.withTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });

  it('passes the original rejection through', async () => {
    const failing = Promise.reject(new Error('refused'));
    await expect(PromiseHelper.withTimeout(failing, 50)).rejects.toThrow('refused');
  });

  it('rejects when the promise never settles', async () => {
    const hangs = new Promise<never>(() => {});
    await expect(PromiseHelper.withTimeout(hangs, 20)).rejects.toThrow('timed out after 20ms');
  });
});
