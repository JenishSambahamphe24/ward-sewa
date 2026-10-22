import { randomBytes } from 'node:crypto';

// Crockford base32 (no I, L, O, U): easy to read out over the phone. 256 % 32 = 0, so no bias.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export class CodeHelper {
  static random(length: number): string {
    return [...randomBytes(length)].map((byte) => ALPHABET[byte % 32]).join('');
  }
}
