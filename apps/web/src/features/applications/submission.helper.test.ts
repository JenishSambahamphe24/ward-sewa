import { describe, expect, it } from 'vitest';
import { SubmissionHelper } from './submission.helper.ts';
import type { Application, ApplicationDocument, ServiceType } from './types.ts';

const serviceType: ServiceType = {
  id: 1,
  code: 'residence',
  nameEn: 'Residence verification',
  nameNe: 'बसोबास प्रमाणित',
  fee: '100.00',
  requiredDocuments: [
    { code: 'citizenship', nameEn: 'Citizenship', nameNe: 'नागरिकता' },
    { code: 'land_tax', nameEn: 'Land tax receipt', nameNe: 'मालपोत रसिद' },
  ],
  formFields: [
    { key: 'residingSince', labelEn: 'Since', labelNe: 'देखि', type: 'date_bs', required: true },
    { key: 'note', labelEn: 'Note', labelNe: 'नोट', type: 'text', required: false },
  ],
};
const application = (formData: Record<string, string>) => ({ formData }) as Application;
const document = (documentCode: string) => ({ documentCode }) as ApplicationDocument;

describe('SubmissionHelper', () => {
  it('lists required documents not yet uploaded and blank required fields', () => {
    const missing = SubmissionHelper.missing(
      serviceType,
      application({ residingSince: '  ', note: '' }),
      [document('citizenship')],
    );
    expect(missing.documents.map((d) => d.code)).toEqual(['land_tax']);
    expect(missing.fields.map((f) => f.key)).toEqual(['residingSince']);
    expect(SubmissionHelper.isComplete(missing)).toBe(false);
  });

  it('is complete once every required document and field is there', () => {
    const missing = SubmissionHelper.missing(
      serviceType,
      application({ residingSince: '2075-03-15' }),
      [document('citizenship'), document('land_tax')],
    );
    expect(SubmissionHelper.isComplete(missing)).toBe(true);
  });
});
