import { BsDateHelper, DivisionHelper } from '@ward-sewa/nepal-utils';
import type { Logger } from 'pino';
import type { FormField, LetterSnapshot } from '../../db/schema/index.ts';
import { AppError } from '../../lib/app-error.ts';
import { CodeHelper } from '../../lib/code.helper.ts';
import type { FileStorage } from '../../lib/file-storage.ts';
import type { ApplicationAccess } from '../applications/application-access.ts';
import type { ApplicationView } from '../applications/applications.repository.ts';
import { applicationIdSchema } from '../applications/applications.schema.ts';
import type { ServiceTypesRepository } from '../service-types/service-types.repository.ts';
import type { User } from '../users/users.repository.ts';
import type { LetterPdfQueue } from './letter-pdf.queue.ts';
import type { IssuedLetter, LettersRepository } from './letters.repository.ts';
import { issueLetterSchema, verificationCodeSchema } from './letters.schema.ts';

export interface LettersServiceDeps {
  letters: LettersRepository;
  access: ApplicationAccess;
  serviceTypes: ServiceTypesRepository;
  queue: LetterPdfQueue;
  storage: FileStorage;
  logger: Logger;
}

export class LettersService {
  readonly #deps: LettersServiceDeps;

  constructor(deps: LettersServiceDeps) {
    this.#deps = deps;
  }

  async issue(staff: User, applicationId: unknown, input: unknown): Promise<IssuedLetter> {
    const { version } = issueLetterSchema.parse(input);
    const application = await this.#deps.access.find(
      staff,
      applicationIdSchema.parse(applicationId),
    );
    if (application.status !== 'approved') {
      throw new AppError(
        409,
        'CONFLICT',
        `Only approved applications can be issued, not ${application.status}`,
      );
    }
    if (staff.wardId === null)
      throw new AppError(403, 'FORBIDDEN', 'Only ward staff issue letters');

    const serviceType = await this.#deps.serviceTypes.find(application.serviceType.id);
    // Nepal's date, not the server's: a letter issued at 1 am in Kathmandu carries that day.
    const today = BsDateHelper.today();
    const letter = await this.#deps.letters.issue({
      applicationId: application.id,
      version,
      wardId: staff.wardId,
      fiscalYear: BsDateHelper.fiscalYear(today).label,
      issuedDateBs: BsDateHelper.format(today),
      verificationCode: CodeHelper.random(10),
      snapshot: this.#snapshot(application, serviceType?.formFields ?? []),
      issuedBy: staff.id,
      issuedByRole: staff.role,
    });
    if (!letter) {
      throw new AppError(
        409,
        'CONFLICT',
        'This application changed since you loaded it; reload it',
      );
    }
    // The letter is already committed; if queueing fails, the worker re-queues it on start.
    await this.#deps.queue.enqueue(letter.id).catch((err: Error) => {
      this.#deps.logger.error(
        { letterId: letter.id, err: err.message },
        'could not queue letter pdf',
      );
    });
    return letter;
  }

  async pdf(user: User, applicationId: unknown): Promise<{ letter: IssuedLetter; data: Buffer }> {
    const letter = await this.forApplication(user, applicationId);
    if (!letter.pdfStorageKey) {
      throw new AppError(409, 'CONFLICT', 'The PDF is still being prepared; try again shortly', {
        headers: { 'Retry-After': '5' },
      });
    }
    return { letter, data: await this.#deps.storage.get(letter.pdfStorageKey) };
  }

  async forApplication(user: User, applicationId: unknown): Promise<IssuedLetter> {
    const application = await this.#deps.access.find(
      user,
      applicationIdSchema.parse(applicationId),
    );
    const letter = await this.#deps.letters.findByApplication(application.id);
    if (!letter) throw new AppError(404, 'NOT_FOUND', 'No letter has been issued yet');
    return letter;
  }

  async verify(code: unknown): Promise<IssuedLetter> {
    const letter = await this.#deps.letters.findByVerificationCode(
      verificationCodeSchema.parse(code),
    );
    if (!letter) throw new AppError(404, 'NOT_FOUND', 'No letter with this verification code');
    return letter;
  }

  #snapshot(application: ApplicationView, formFields: readonly FormField[]): LetterSnapshot {
    const { localLevelCode, wardNo, tole, houseNo } = application.address;
    const localLevel = DivisionHelper.getLocalLevel(localLevelCode);
    const district = localLevel && DivisionHelper.getDistrict(localLevel.districtCode);
    const province =
      district && DivisionHelper.provinces.find((p) => p.code === district.provinceCode);
    if (!localLevel || !district || !province || !application.applicant.name) {
      throw new Error(`Incomplete data for letter on application ${application.id}`);
    }
    const { code, nameEn, nameNe } = application.serviceType;
    return {
      applicant: { name: application.applicant.name },
      serviceType: { code, nameEn, nameNe },
      address: {
        province: province.name,
        district: district.name,
        localLevel: localLevel.name,
        localLevelCode,
        wardNo,
        tole,
        houseNo,
      },
      formData: application.formData,
      fields: formFields
        .filter((field) => application.formData[field.key] !== undefined)
        .map(({ key, labelNe, labelEn }) => ({
          key,
          labelNe,
          labelEn,
          value: application.formData[key] ?? '',
        })),
    };
  }
}
