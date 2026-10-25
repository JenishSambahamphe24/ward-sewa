import { z } from 'zod';
import type { ZodObject, ZodType } from 'zod';
import {
  createApplicationSchema,
  listApplicationsQuerySchema,
  submitApplicationSchema,
  transitionSchema,
  updateApplicationSchema,
  wardQueueQuerySchema,
} from '../applications/applications.schema.ts';
import { requestOtpSchema, verifyOtpSchema } from '../auth/auth.schema.ts';
import { uploadDocumentSchema } from '../documents/documents.schema.ts';
import { issueLetterSchema, verificationCodeSchema } from '../letters/letters.schema.ts';
import {
  assignStaffSchema,
  listStaffQuerySchema,
  updateStaffSchema,
} from '../staff/staff.schema.ts';
import { localLevelCodeSchema, updateProfileSchema } from '../users/users.schema.ts';
import {
  applicationResponse,
  applicationsPageResponse,
  auditEventResponse,
  documentResponse,
  errorResponse,
  healthResponse,
  historyEntryResponse,
  letterResponse,
  serviceTypeResponse,
  staffMemberResponse,
  userResponse,
  verifiedLetterResponse,
} from './docs.schema.ts';

type Method = 'get' | 'post' | 'patch';
type JsonSchema = Record<string, unknown>;

interface Operation {
  method: Method;
  path: string;
  tag: keyof typeof TAGS;
  summary: string;
  // undefined = public; [] = any logged-in user
  roles?: string[];
  params?: Record<string, ZodType>;
  query?: ZodObject;
  headers?: Record<string, { schema: ZodType; description: string }>;
  body?: ZodType | 'multipart';
  ok: { status: number; schema?: ZodType; file?: string; description?: string };
  errors?: Record<number, string>;
}

const id = z.coerce.number().int().positive();
const one = <T extends ZodType>(key: string, schema: T) => z.object({ [key]: schema });
const many = <T extends ZodType>(key: string, schema: T) => z.object({ [key]: z.array(schema) });
const CITIZEN = ['citizen'];
const STAFF = ['ward_secretary', 'ward_chair'];
const ADMIN = ['municipality_admin'];
const APPLICANT_OR_STAFF = ['citizen', ...STAFF];

// Every route in the API, in the order a client meets them. A test fails if one is missing here.
const OPERATIONS: Operation[] = [
  {
    method: 'get',
    path: '/health/live',
    tag: 'Health',
    summary: 'The process is running (never checks dependencies)',
    ok: { status: 200, schema: z.object({ status: z.literal('ok') }) },
  },
  {
    method: 'get',
    path: '/health/ready',
    tag: 'Health',
    summary: 'PostgreSQL, MongoDB and Redis all answer; 503 if any is down',
    ok: { status: 200, schema: healthResponse },
    errors: { 503: 'A dependency is down (same body, status "degraded")' },
  },
  {
    method: 'post',
    path: '/auth/otp/request',
    tag: 'Auth',
    summary: 'Send a 6-digit login code by SMS (3 per number per 15 minutes)',
    body: requestOtpSchema,
    ok: { status: 202, schema: z.object({ expiresInSeconds: z.number().int() }) },
  },
  {
    method: 'post',
    path: '/auth/otp/verify',
    tag: 'Auth',
    summary: 'Exchange the code for a session token; creates a citizen account on first login',
    body: verifyOtpSchema,
    ok: { status: 200, schema: z.object({ token: z.string(), user: userResponse }) },
    errors: { 401: 'Wrong or expired code', 403: 'Account deactivated' },
  },
  {
    method: 'get',
    path: '/auth/me',
    tag: 'Auth',
    summary: 'The logged-in user',
    roles: [],
    ok: { status: 200, schema: one('user', userResponse) },
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'End this session',
    roles: [],
    ok: { status: 204, description: 'Logged out' },
  },
  {
    method: 'patch',
    path: '/users/me',
    tag: 'Users',
    summary: 'Set the name printed on letters',
    roles: [],
    body: updateProfileSchema,
    ok: { status: 200, schema: one('user', userResponse) },
  },
  {
    method: 'get',
    path: '/service-types',
    tag: 'Service types',
    summary: "A municipality's letter types, fields and required documents (cached 10 min)",
    query: z.object({ localLevel: localLevelCodeSchema }),
    ok: { status: 200, schema: many('serviceTypes', serviceTypeResponse) },
  },
  {
    method: 'post',
    path: '/applications',
    tag: 'Applications',
    summary: 'Start a draft application',
    roles: CITIZEN,
    headers: {
      'Idempotency-Key': {
        schema: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
        description: 'Retrying with the same key returns the first result instead of a duplicate',
      },
    },
    body: createApplicationSchema,
    ok: { status: 201, schema: one('application', applicationResponse) },
    errors: { 409: 'Same key still being processed', 422: 'Same key reused with a different body' },
  },
  {
    method: 'get',
    path: '/applications',
    tag: 'Applications',
    summary: 'My applications, newest first',
    roles: CITIZEN,
    query: listApplicationsQuerySchema,
    ok: { status: 200, schema: applicationsPageResponse },
  },
  {
    method: 'get',
    path: '/applications/{id}',
    tag: 'Applications',
    summary: 'One of my applications',
    roles: CITIZEN,
    params: { id },
    ok: { status: 200, schema: one('application', applicationResponse) },
  },
  {
    method: 'patch',
    path: '/applications/{id}',
    tag: 'Applications',
    summary: 'Edit a draft or needs-info application',
    roles: CITIZEN,
    params: { id },
    body: updateApplicationSchema,
    ok: { status: 200, schema: one('application', applicationResponse) },
    errors: { 409: 'Stale version, or no longer editable' },
  },
  {
    method: 'post',
    path: '/applications/{id}/submit',
    tag: 'Applications',
    summary: 'Submit for review; needs every required field and document',
    roles: CITIZEN,
    params: { id },
    body: submitApplicationSchema,
    ok: { status: 200, schema: one('application', applicationResponse) },
    errors: { 409: 'Stale version, or not editable' },
  },
  {
    method: 'get',
    path: '/applications/{id}/history',
    tag: 'Applications',
    summary: 'Every status change with staff notes',
    roles: APPLICANT_OR_STAFF,
    params: { id },
    ok: { status: 200, schema: many('history', historyEntryResponse) },
  },
  {
    method: 'post',
    path: '/applications/{id}/documents',
    tag: 'Documents',
    summary: 'Upload a required document (PDF, JPEG or PNG, at most 5 MB; replaces the old one)',
    roles: CITIZEN,
    params: { id },
    body: 'multipart',
    ok: { status: 201, schema: one('document', documentResponse) },
    errors: { 409: 'Application no longer editable', 413: 'Larger than 5 MB' },
  },
  {
    method: 'get',
    path: '/applications/{id}/documents',
    tag: 'Documents',
    summary: "An application's documents",
    roles: APPLICANT_OR_STAFF,
    params: { id },
    ok: { status: 200, schema: many('documents', documentResponse) },
  },
  {
    method: 'get',
    path: '/applications/{id}/documents/{documentId}/file',
    tag: 'Documents',
    summary: 'Download a document as an attachment',
    roles: APPLICANT_OR_STAFF,
    params: { id, documentId: id },
    ok: { status: 200, file: 'application/octet-stream' },
  },
  {
    method: 'get',
    path: '/staff/applications',
    tag: 'Review',
    summary: "My ward's queue, oldest first",
    roles: STAFF,
    query: wardQueueQuerySchema,
    ok: { status: 200, schema: applicationsPageResponse },
  },
  {
    method: 'get',
    path: '/staff/applications/{id}',
    tag: 'Review',
    summary: 'One application from my ward (never a draft)',
    roles: STAFF,
    params: { id },
    ok: { status: 200, schema: one('application', applicationResponse) },
  },
  {
    method: 'post',
    path: '/staff/applications/{id}/transition',
    tag: 'Review',
    summary:
      'Move through the workflow: secretary starts review; only the chair approves; ' +
      'needs_info and rejected need a note',
    roles: STAFF,
    params: { id },
    body: transitionSchema,
    ok: { status: 200, schema: one('application', applicationResponse) },
    errors: { 409: 'Stale version, or a step the workflow does not allow from here' },
  },
  {
    method: 'post',
    path: '/staff/applications/{id}/issue',
    tag: 'Letters',
    summary: "Issue an approved letter: the ward's next number for this fiscal year",
    roles: STAFF,
    params: { id },
    body: issueLetterSchema,
    ok: { status: 201, schema: one('letter', letterResponse) },
    errors: { 409: 'Stale version, or not approved' },
  },
  {
    method: 'get',
    path: '/applications/{id}/letter',
    tag: 'Letters',
    summary: 'The issued letter; pdfReady turns true once the worker has rendered it',
    roles: APPLICANT_OR_STAFF,
    params: { id },
    ok: { status: 200, schema: one('letter', letterResponse) },
  },
  {
    method: 'get',
    path: '/applications/{id}/letter/pdf',
    tag: 'Letters',
    summary: 'Download the letter PDF',
    roles: APPLICANT_OR_STAFF,
    params: { id },
    ok: { status: 200, file: 'application/pdf' },
    errors: { 409: 'PDF not rendered yet (Retry-After: 5)' },
  },
  {
    method: 'get',
    path: '/verify/{code}',
    tag: 'Letters',
    summary: 'Public check that a printed letter is genuine (what the QR code opens)',
    params: { code: verificationCodeSchema },
    ok: { status: 200, schema: verifiedLetterResponse },
  },
  {
    method: 'get',
    path: '/applications/{id}/audit',
    tag: 'Audit',
    summary: 'Audit trail from MongoDB (arrives a few seconds after each change)',
    roles: APPLICANT_OR_STAFF,
    params: { id },
    ok: { status: 200, schema: many('events', auditEventResponse) },
  },
  {
    method: 'get',
    path: '/admin/staff',
    tag: 'Staff',
    summary: 'Ward staff of my municipality',
    roles: ADMIN,
    query: listStaffQuerySchema,
    ok: { status: 200, schema: many('staff', staffMemberResponse) },
  },
  {
    method: 'post',
    path: '/admin/staff',
    tag: 'Staff',
    summary: 'Assign a ward secretary or chair (promotes an existing citizen account)',
    roles: ADMIN,
    body: assignStaffSchema,
    ok: { status: 201, schema: one('staff', staffMemberResponse) },
    errors: { 409: 'details.reason: ward_has_chair or phone_is_staff' },
  },
  {
    method: 'patch',
    path: '/admin/staff/{id}',
    tag: 'Staff',
    summary: 'Move, switch role, deactivate or reactivate (never delete)',
    roles: ADMIN,
    params: { id },
    body: updateStaffSchema,
    ok: { status: 200, schema: one('staff', staffMemberResponse) },
    errors: { 409: 'details.reason: ward_has_chair' },
  },
];

const TAGS = {
  Health: 'Liveness and readiness for load balancers and orchestrators',
  Auth: 'Phone + one-time code login; opaque bearer sessions stored in Redis',
  Users: 'The logged-in user’s own profile',
  'Service types': 'Letter types each municipality offers, with their fields and documents',
  Applications: 'A citizen’s own applications, from draft to submission',
  Documents: 'Uploads checked by their bytes; downloads for the applicant and ward staff',
  Review: 'The ward queue and workflow steps, scoped to the staff member’s ward',
  Letters: 'Issuing numbered letters, their PDF, and public verification',
  Audit: 'Append-only audit trail, stored in MongoDB',
  Staff: 'Municipality admins managing ward secretaries and chairs',
} as const;

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Validation failed (details lists the problems)',
  401: 'Missing, expired or revoked session',
  403: 'Wrong role or scope',
  404: 'Not found, or not yours',
  429: 'Rate limited (Retry-After)',
};

export class OpenApiHelper {
  static readonly operations: readonly Pick<Operation, 'method' | 'path'>[] = OPERATIONS;

  // "post /applications/{id}/submit" → "postApplicationsByIdSubmit"
  static #operationId({ method, path }: Operation): string {
    const words = path
      .split('/')
      .filter(Boolean)
      .map((part) => part.replace(/^\{(\w+)\}$/, 'by-$1'))
      .flatMap((part) => part.split(/[-_]/));
    return method + words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }

  static document(): JsonSchema {
    const components: Record<string, JsonSchema> = {};
    // zod puts named schemas in $defs; OpenAPI wants them once, under components.schemas.
    const toJson = (schema: ZodType, io: 'input' | 'output'): JsonSchema => {
      const converted: JsonSchema = JSON.parse(
        JSON.stringify(z.toJSONSchema(schema, { io, unrepresentable: 'any' })).replaceAll(
          '#/$defs/',
          '#/components/schemas/',
        ),
      );
      Object.assign(components, converted.$defs);
      delete converted.$defs;
      delete converted.$schema;
      // A named schema converted on its own comes back as a $ref to its own $defs entry.
      const name = z.globalRegistry.get(schema)?.id;
      if (!name || converted.$ref) return converted;
      delete converted.id;
      components[name] = converted;
      return { $ref: `#/components/schemas/${name}` };
    };
    const json = (schema: JsonSchema) => ({ 'application/json': { schema } });
    const errorRef = toJson(errorResponse, 'output');

    const paths: Record<string, Record<string, unknown>> = {};
    for (const op of OPERATIONS) {
      const parameters = [
        ...Object.entries(op.params ?? {}).map(([name, schema]) => ({
          name,
          in: 'path',
          required: true,
          schema: toJson(schema, 'input'),
        })),
        ...Object.entries(op.query?.shape ?? {}).map(([name, schema]) => ({
          name,
          in: 'query',
          required: !(schema as ZodType).safeParse(undefined).success,
          schema: toJson(schema as ZodType, 'input'),
        })),
        ...Object.entries(op.headers ?? {}).map(([name, header]) => ({
          name,
          in: 'header',
          description: header.description,
          schema: toJson(header.schema, 'input'),
        })),
      ];

      let requestBody: unknown;
      if (op.body === 'multipart') {
        const fields = toJson(uploadDocumentSchema, 'input');
        const properties = {
          ...(fields.properties as JsonSchema),
          file: { type: 'string', format: 'binary' },
        };
        requestBody = {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties, required: ['documentCode', 'file'] },
            },
          },
        };
      } else if (op.body) {
        requestBody = { required: true, content: json(toJson(op.body, 'input')) };
      }

      const errorCodes = new Set<number>([429]);
      if (op.body || op.query || op.params) errorCodes.add(400);
      if (op.roles) errorCodes.add(401);
      if (op.roles && op.roles.length > 0) errorCodes.add(403);
      if (op.params) errorCodes.add(404);
      const responses: Record<string, unknown> = {
        [op.ok.status]: {
          description: op.ok.description ?? 'OK',
          ...(op.ok.schema && { content: json(toJson(op.ok.schema, 'output')) }),
          ...(op.ok.file && {
            content: { [op.ok.file]: { schema: { type: 'string', format: 'binary' } } },
          }),
        },
      };
      for (const code of [...errorCodes].sort()) {
        responses[code] = { description: ERROR_DESCRIPTIONS[code], content: json(errorRef) };
      }
      for (const [code, description] of Object.entries(op.errors ?? {})) {
        responses[code] = { description, content: json(errorRef) };
      }

      const access = op.roles?.length ? ` Roles: ${op.roles.join(', ')}.` : '';
      const path = (paths[op.path] ??= {});
      path[op.method] = {
        tags: [op.tag],
        summary: op.summary,
        ...(access && { description: access.trim() }),
        operationId: OpenApiHelper.#operationId(op),
        security: op.roles ? [{ session: [] }] : [],
        ...(parameters.length > 0 && { parameters }),
        ...(requestBody !== undefined && { requestBody }),
        responses,
      };
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'Ward Sewa API',
        version: '1.0.0',
        description:
          'Ward-office recommendation letters. Log in with POST /auth/otp/request, read the code ' +
          'from the API log in development, then POST /auth/otp/verify and use the token with ' +
          '"Authorize". Errors always have the shape { error: { code, message, details? } }.',
      },
      // Relative to where this document is served: /openapi.json directly, /api/openapi.json via nginx.
      servers: [{ url: '.' }],
      tags: Object.entries(TAGS).map(([name, description]) => ({ name, description })),
      components: {
        securitySchemes: { session: { type: 'http', scheme: 'bearer' } },
        schemas: components,
      },
      paths,
    };
  }
}
