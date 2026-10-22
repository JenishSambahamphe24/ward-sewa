import { describe, expect, it } from 'vitest';
import { FileTypeHelper } from '../../src/lib/file-type.helper.ts';

describe('FileTypeHelper.detect', () => {
  it.each([
    ['PDF', Buffer.from('%PDF-1.7\n'), 'application/pdf'],
    ['PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]), 'image/png'],
    ['JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]), 'image/jpeg'],
  ])('recognises %s from its first bytes', (_name, data, mime) => {
    expect(FileTypeHelper.detect(data)).toBe(mime);
  });

  it('rejects anything else, whatever it claims to be', () => {
    expect(FileTypeHelper.detect(Buffer.from('MZ\x90\x00 not really a pdf'))).toBeNull();
    expect(FileTypeHelper.detect(Buffer.alloc(0))).toBeNull();
  });
});
