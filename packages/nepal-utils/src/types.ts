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
  code: string;
  name: string;
}

export interface District {
  code: string;
  name: string;
  provinceCode: string;
}

export type LocalLevelType =
  'metropolitan' | 'sub_metropolitan' | 'municipality' | 'rural_municipality';

export interface LocalLevel {
  code: string;
  name: string;
  type: LocalLevelType;
  districtCode: string;
  wards: number;
}
