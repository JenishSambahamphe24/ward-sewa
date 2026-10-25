// Crockford base32 without I, L, O, U; matches the API's verificationCodeSchema.
const CODE = /^[0-9A-HJKMNP-TV-Z]{10}$/;

export class VerificationCodeHelper {
  // People type codes from paper: accept lower case, spaces and dashes.
  static normalize(input: string): string {
    return input.toUpperCase().replace(/[\s-]/g, '');
  }

  static isValid(code: string): boolean {
    return CODE.test(code);
  }
}
