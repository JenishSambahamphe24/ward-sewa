import { NumeralHelper } from '@ward-sewa/nepal-utils';
import { getLocale } from '@/paraglide/runtime.js';

export class LocaleHelper {
  static isNepali(): boolean {
    return getLocale() === 'ne';
  }

  static digits(value: string | number): string {
    return LocaleHelper.isNepali() ? NumeralHelper.toNepali(value) : String(value);
  }

  static pick<T>(nepali: T, english: T): T {
    return LocaleHelper.isNepali() ? nepali : english;
  }
}
