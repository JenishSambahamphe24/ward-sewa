import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, Eye, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { ApiError } from '@/lib/api-client.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { cn } from '@/lib/cn.ts';
import { FileViewHelper } from '@/lib/file-view.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { ApplicationsApi, documentsQuery } from './queries.ts';
import type { ApplicationDocument, RequiredDocument } from './types.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png'];

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'PAYLOAD_TOO_LARGE')
    return m.documents_too_large();
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED')
    return m.documents_wrong_type();
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED')
    return m.documents_wrong_type();
  return ApiErrorHelper.message(error);
}

interface DocumentRowProps {
  applicationId: number;
  required: RequiredDocument;
  uploaded: ApplicationDocument | undefined;
  editable: boolean;
}

function DocumentRow({ applicationId, required, uploaded, editable }: DocumentRowProps) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => ApplicationsApi.uploadDocument(applicationId, required.code, file),
    onSuccess: () => queryClient.invalidateQueries(documentsQuery(applicationId)),
  });
  const view = useMutation({
    mutationFn: (documentId: number) => ApplicationsApi.documentFile(applicationId, documentId),
    onSuccess: FileViewHelper.open,
  });

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setLocalError(m.documents_too_large());
    } else if (!ACCEPT.includes(file.type)) {
      setLocalError(m.documents_wrong_type());
    } else {
      setLocalError(null);
      upload.mutate(file);
    }
  };
  const serverError = upload.isError ? uploadErrorMessage(upload.error) : null;
  const viewError = view.isError ? ApiErrorHelper.message(view.error) : null;
  const error = localError ?? serverError ?? viewError;
  const detail = uploaded
    ? `${uploaded.originalName} · ${FileViewHelper.size(uploaded.sizeBytes)}`
    : m.documents_missing();
  let uploadLabel = uploaded ? m.documents_replace() : m.documents_upload();
  if (upload.isPending) uploadLabel = m.documents_uploading();

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {uploaded ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        ) : (
          <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="flex flex-col">
          <span className="font-medium">{LocaleHelper.pick(required.nameNe, required.nameEn)}</span>
          <span
            role={error === null ? undefined : 'alert'}
            className={cn('text-xs', {
              'text-danger': error !== null,
              'text-muted-foreground': error === null,
            })}
          >
            {error ?? detail}
          </span>
        </div>
      </div>
      <div className="flex gap-2 pl-8 sm:pl-0">
        {uploaded && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => view.mutate(uploaded.id)}
            disabled={view.isPending}
          >
            <Eye />
            {m.documents_view()}
          </Button>
        )}
        {editable && (
          <>
            <input
              ref={input}
              type="file"
              accept={ACCEPT.join(',')}
              className="sr-only"
              onChange={choose}
              tabIndex={-1}
              aria-hidden
            />
            <Button
              variant={uploaded ? 'ghost' : 'accent'}
              size="sm"
              onClick={() => input.current?.click()}
              disabled={upload.isPending}
            >
              <Upload />
              {uploadLabel}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

interface DocumentsCardProps {
  applicationId: number;
  requiredDocuments: readonly RequiredDocument[];
  editable: boolean;
}

export function DocumentsCard({ applicationId, requiredDocuments, editable }: DocumentsCardProps) {
  const { data: documents = [] } = useQuery(documentsQuery(applicationId));
  return (
    <Card glass>
      <CardHeader>
        <CardTitle>{m.documents_heading()}</CardTitle>
        {editable && <CardDescription>{m.documents_hint()}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {requiredDocuments.map((required) => (
            <DocumentRow
              key={required.code}
              applicationId={applicationId}
              required={required}
              uploaded={documents.find((d) => d.documentCode === required.code)}
              editable={editable}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
