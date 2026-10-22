import type { DOCUMENT_MIME_TYPES } from '../db/schema/index.ts';

type DocumentMime = (typeof DOCUMENT_MIME_TYPES)[number];

const SIGNATURES: [DocumentMime, number[]][] = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
];

export class FileTypeHelper {
  // Trusts the bytes, not the client's Content-Type or file name.
  static detect(data: Buffer): DocumentMime | null {
    const match = SIGNATURES.find(([, bytes]) => bytes.every((byte, i) => data[i] === byte));
    return match?.[0] ?? null;
  }
}
