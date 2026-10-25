import type {
  Application,
  ApplicationDocument,
  FormField,
  RequiredDocument,
  ServiceType,
} from './types.ts';

export interface Missing {
  documents: RequiredDocument[];
  fields: FormField[];
}

export class SubmissionHelper {
  // Mirrors the server's submit check so the citizen sees what's left before trying.
  static missing(
    serviceType: ServiceType,
    application: Application,
    documents: readonly ApplicationDocument[],
  ): Missing {
    const uploaded = new Set(documents.map((d) => d.documentCode));
    return {
      documents: serviceType.requiredDocuments.filter((d) => !uploaded.has(d.code)),
      fields: serviceType.formFields.filter(
        (f) => f.required && !application.formData[f.key]?.trim(),
      ),
    };
  }

  static isComplete(missing: Missing): boolean {
    return missing.documents.length === 0 && missing.fields.length === 0;
  }
}
