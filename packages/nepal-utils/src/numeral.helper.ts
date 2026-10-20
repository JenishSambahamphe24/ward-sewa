const DEVANAGARI_ZERO = 0x0966;

export class NumeralHelper {
  static toNepali(value: string | number): string {
    return String(value).replace(/[0-9]/g, (d) => String.fromCharCode(DEVANAGARI_ZERO + Number(d)));
  }

  static toEnglish(value: string | number): string {
    return String(value).replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO));
  }
}
