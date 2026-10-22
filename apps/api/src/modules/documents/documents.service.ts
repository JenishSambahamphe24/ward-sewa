import { randomUUID, createHash } from 'node:crypto';
import { AppError } from '../../lib/app-error.ts';
import type { FileStorage } from '../../lib/file-storage.ts';
import { FileTypeHelper } from '../../lib/file-type.helper.ts';
import { EDITABLE_STATUSES } from '../applications/applications.repository.ts';
import type { ApplicationAccess } from '../applications/application-access.ts';
import { applicationIdSchema } from '../applications/applications.schema.ts';
import type { ApplicationsService } from '../applications/applications.service.ts';
import type { ServiceTypesRepository } from '../service-types/service-types.repository.ts';
import type { User } from '../users/users.repository.ts';
import type { Document, DocumentsRepository } from './documents.repository.ts';
import { documentIdSchema, uploadDocumentSchema } from './documents.schema.ts';

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
}

export interface DocumentsServiceDeps {
  applications: ApplicationsService;
  access: ApplicationAccess;
  serviceTypes: ServiceTypesRepository;
  documents: DocumentsRepository;
  storage: FileStorage;
}

export class DocumentsService {
  readonly #deps: DocumentsServiceDeps;

  constructor(deps: DocumentsServiceDeps) {
    this.#deps = deps;
  }

  async upload(
    citizen: User,
    applicationId: unknown,
    body: unknown,
    file: UploadedFile | undefined,
  ): Promise<Document> {
    const { documentCode } = uploadDocumentSchema.parse(body);
    const application = await this.#deps.applications.get(citizen, applicationId);
    if (!EDITABLE_STATUSES.includes(application.status)) {
      throw new AppError(409, 'CONFLICT', `Documents can't change while ${application.status}`);
    }
    const serviceType = await this.#deps.serviceTypes.find(application.serviceType.id);
    if (!serviceType?.requiredDocuments.some((d) => d.code === documentCode)) {
      throw new AppError(400, 'VALIDATION_FAILED', `This service does not ask for ${documentCode}`);
    }
    if (!file) throw new AppError(400, 'VALIDATION_FAILED', 'Attach the file in the "file" field');
    const mime = FileTypeHelper.detect(file.buffer);
    if (!mime)
      throw new AppError(400, 'VALIDATION_FAILED', 'Only PDF, JPEG or PNG files are accepted');

    const storageKey = `applications/${application.id}/${randomUUID()}`;
    await this.#deps.storage.put(storageKey, file.buffer);
    try {
      const { document, replacedKey } = await this.#deps.documents.replace({
        applicationId: application.id,
        documentCode,
        storageKey,
        originalName: file.originalName.slice(0, 255),
        mime,
        sizeBytes: file.buffer.length,
        sha256: createHash('sha256').update(file.buffer).digest('hex'),
        uploadedBy: citizen.id,
      });
      if (replacedKey) await this.#deps.storage.delete(replacedKey);
      return document;
    } catch (err) {
      await this.#deps.storage.delete(storageKey);
      throw err;
    }
  }

  async list(user: User, applicationId: unknown): Promise<Document[]> {
    const application = await this.#deps.access.find(
      user,
      applicationIdSchema.parse(applicationId),
    );
    return this.#deps.documents.list(application.id);
  }

  // Readable by the applicant and their ward's staff; only the applicant uploads.
  async download(
    user: User,
    applicationId: unknown,
    documentId: unknown,
  ): Promise<{ document: Document; data: Buffer }> {
    const application = await this.#deps.access.find(
      user,
      applicationIdSchema.parse(applicationId),
    );
    const document = await this.#deps.documents.find(
      application.id,
      documentIdSchema.parse(documentId),
    );
    if (!document) throw new AppError(404, 'NOT_FOUND', 'No such document');
    return { document, data: await this.#deps.storage.get(document.storageKey) };
  }
}
