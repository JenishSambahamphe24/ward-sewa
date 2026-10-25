import { NumeralHelper } from '@ward-sewa/nepal-utils';

const MOBILE = /^9[678]\d{8}$/;

export class PhoneHelper {
  // Accepts Devanagari digits and stray spaces or dashes: "९८४१-००००१०" → "9841000010".
  static normalize(input: string): string {
    return NumeralHelper.toEnglish(input).replace(/\D/g, '');
  }

  static isValid(phone: string): boolean {
    return MOBILE.test(phone);
  }
}
