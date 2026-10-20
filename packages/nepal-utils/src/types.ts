export interface SimpleDate {
  year: number;
  /** 1–12, unlike JS `Date`. */
  month: number;
  day: number;
}

export type BsLocale = 'en' | 'ne';

export type BsFormatStyle = 'iso' | 'long';

export interface BsFormatOptions {
  locale?: BsLocale;
  style?: BsFormatStyle;
}

export interface FiscalYear {
  startYear: number;
  endYear: number;
  label: string;
}

export interface Province {
  id: number;
  nameEn: string;
  nameNe: string;
  districts: readonly string[];
}

export interface District {
  name: string;
  provinceId: number;
}
