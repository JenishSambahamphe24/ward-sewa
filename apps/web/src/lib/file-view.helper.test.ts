import { describe, expect, it } from 'vitest';
import { FileViewHelper } from './file-view.helper.ts';

describe('FileViewHelper.size', () => {
  it.each([
    [512, '512 B'],
    [2048, '2 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
  ])('%i bytes → %s', (bytes, expected) => {
    expect(FileViewHelper.size(bytes)).toBe(expected);
  });
});
