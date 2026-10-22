import { sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { serviceTypes } from '../schema/index.ts';
import type { FormField, RequiredDocument } from '../schema/index.ts';

// SAMPLE DATA for the demo municipalities. Real fees and documents differ per municipality and
// would be managed by each municipality admin.
export const DEMO_LOCAL_LEVELS = ['NP0327101', 'NP0325101'];

const citizenship: RequiredDocument = {
  code: 'citizenship',
  nameEn: 'Citizenship certificate',
  nameNe: 'नागरिकता प्रमाणपत्र',
};

const SAMPLE_TYPES: {
  code: string;
  nameEn: string;
  nameNe: string;
  fee: string;
  requiredDocuments: RequiredDocument[];
  formFields: FormField[];
}[] = [
  {
    code: 'residence',
    nameEn: 'Residence verification',
    nameNe: 'बसोबास प्रमाणित',
    fee: '100.00',
    requiredDocuments: [
      citizenship,
      {
        code: 'land_or_rent',
        nameEn: 'Land ownership or rental agreement',
        nameNe: 'जग्गाधनी प्रमाणपुर्जा वा घरभाडा सम्झौता',
      },
    ],
    formFields: [
      {
        key: 'residingSince',
        labelEn: 'Living here since (BS)',
        labelNe: 'बसोबास सुरु मिति',
        type: 'date_bs',
        required: true,
      },
    ],
  },
  {
    code: 'relationship',
    nameEn: 'Relationship verification',
    nameNe: 'नाता प्रमाणित',
    fee: '200.00',
    requiredDocuments: [
      citizenship,
      {
        code: 'relative_citizenship',
        nameEn: "Relative's citizenship certificate",
        nameNe: 'नातेदारको नागरिकता प्रमाणपत्र',
      },
    ],
    formFields: [
      {
        key: 'relativeName',
        labelEn: "Relative's full name",
        labelNe: 'नातेदारको पूरा नाम',
        type: 'text',
        required: true,
      },
      {
        key: 'relation',
        labelEn: 'Relation to applicant',
        labelNe: 'निवेदकसँगको नाता',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    code: 'birth_date',
    nameEn: 'Date of birth verification',
    nameNe: 'जन्म मिति प्रमाणित',
    fee: '100.00',
    requiredDocuments: [citizenship],
    formFields: [
      {
        key: 'dateOfBirth',
        labelEn: 'Date of birth (BS)',
        labelNe: 'जन्म मिति',
        type: 'date_bs',
        required: true,
      },
    ],
  },
  {
    code: 'unmarried',
    nameEn: 'Unmarried verification',
    nameNe: 'अविवाहित प्रमाणित',
    fee: '100.00',
    requiredDocuments: [citizenship],
    formFields: [],
  },
];

const excluded = (column: string) => sql.raw(`excluded.${column}`);

export class ServiceTypesSeed {
  static async run(db: Db): Promise<void> {
    await db
      .insert(serviceTypes)
      .values(
        DEMO_LOCAL_LEVELS.flatMap((localLevelCode) =>
          SAMPLE_TYPES.map((t) => ({ ...t, localLevelCode })),
        ),
      )
      .onConflictDoUpdate({
        target: [serviceTypes.localLevelCode, serviceTypes.code],
        set: {
          nameEn: excluded('name_en'),
          nameNe: excluded('name_ne'),
          fee: excluded('fee'),
          requiredDocuments: excluded('required_documents'),
          formFields: excluded('form_fields'),
        },
      });
  }
}
