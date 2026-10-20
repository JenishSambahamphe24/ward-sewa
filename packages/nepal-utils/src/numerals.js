const DEVANAGARI_ZERO = 0x0966;

/** 2083 → "२०८३". Non-digit characters pass through unchanged. */
export function toNepaliDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => String.fromCharCode(DEVANAGARI_ZERO + Number(d)));
}

/** "२०८३" → "2083". Non-digit characters pass through unchanged. */
export function toEnglishDigits(value) {
  return String(value).replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO));
}
