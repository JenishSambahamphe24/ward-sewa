import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalFileStorage } from '../../src/lib/file-storage.ts';

const storage = () => new LocalFileStorage(mkdtempSync(join(tmpdir(), 'ward-sewa-storage-')));

describe('LocalFileStorage', () => {
  it('stores, reads and deletes a file', async () => {
    const files = storage();
    await files.put('applications/1/a', Buffer.from('hello'));
    expect((await files.get('applications/1/a')).toString()).toBe('hello');
    await files.delete('applications/1/a');
    await expect(files.get('applications/1/a')).rejects.toThrow();
  });

  it('never overwrites an existing key', async () => {
    const files = storage();
    await files.put('k', Buffer.from('first'));
    await expect(files.put('k', Buffer.from('second'))).rejects.toThrow();
  });

  it('refuses keys that escape the storage root', async () => {
    await expect(storage().get('../../etc/passwd')).rejects.toThrow('escapes the root');
  });
});
