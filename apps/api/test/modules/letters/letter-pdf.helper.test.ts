import { describe, expect, it } from 'vitest';
import { LetterPdfHelper } from '../../../src/modules/letters/letter-pdf.helper.ts';
import type { IssuedLetter } from '../../../src/modules/letters/letters.repository.ts';

const letter: IssuedLetter = {
  id: 1,
  applicationId: 1,
  wardId: 1,
  issuedBy: 1,
  issuedAt: new Date('2026-10-22T04:20:55Z'),
  pdfStorageKey: null,
  letterNo: '2083/84-0001',
  fiscalYear: '2083/84',
  serialNo: 1,
  issuedDateBs: '2083-07-05',
  verificationCode: 'JVXWR6WF4T',
  snapshot: {
    applicant: { name: 'Ram Bahadur Thapa' },
    serviceType: { code: 'residence', nameEn: 'Residence verification', nameNe: 'बसोबास प्रमाणित' },
    address: {
      province: 'Bagmati',
      district: 'Kathmandu',
      localLevel: 'Kathmandu',
      localLevelCode: 'NP0327101',
      wardNo: 5,
      tole: 'Baneshwor',
      houseNo: null,
    },
    formData: { residingSince: '2075-03-15' },
  },
};

describe('LetterPdfHelper.runs', () => {
  it('splits text into Devanagari and Latin runs, keeping spaces with the current run', () => {
    expect(LetterPdfHelper.runs('श्री Ram Thapa ले')).toEqual([
      { text: 'श्री ', devanagari: true },
      { text: 'Ram Thapa ', devanagari: false },
      { text: 'ले', devanagari: true },
    ]);
  });

  it('keeps Devanagari digits and the danda with Devanagari text', () => {
    expect(LetterPdfHelper.runs('वडा नं. ५।')).toEqual([{ text: 'वडा नं. ५।', devanagari: true }]);
  });
});

describe('LetterPdfHelper.render', () => {
  it('produces a PDF that embeds both the Devanagari and the Latin font', async () => {
    const pdf = await LetterPdfHelper.render(letter, 'http://localhost:5173/verify/JVXWR6WF4T');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = pdf.toString('latin1');
    expect(text).toContain('NotoSansDevanagari');
    expect(text).toMatch(/NotoSans-(Regular|Bold)/);
  });
});
