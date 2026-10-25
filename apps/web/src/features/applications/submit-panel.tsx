import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { ApiError } from '@/lib/api-client.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { ApplicationsApi, applicationQuery, documentsQuery, historyQuery } from './queries.ts';
import { SubmissionHelper } from './submission.helper.ts';
import type { Application, ServiceType } from './types.ts';
import { EDITABLE_STATUSES } from './types.ts';

const STATUS_NOTE = {
  submitted: m.detail_waiting_note,
  under_review: m.detail_waiting_note,
  approved: m.detail_approved_note,
  rejected: m.detail_rejected_note,
  issued: m.detail_issued_note,
} as const;

interface SubmitPanelProps {
  application: Application;
  serviceType: ServiceType;
}

export function SubmitPanel({ application, serviceType }: SubmitPanelProps) {
  const queryClient = useQueryClient();
  const { data: documents = [] } = useQuery(documentsQuery(application.id));
  const missing = SubmissionHelper.missing(serviceType, application, documents);
  const editable = EDITABLE_STATUSES.includes(application.status);

  const submit = useMutation({
    mutationFn: () => ApplicationsApi.submit(application.id, application.version),
    onSuccess: (updated) => {
      queryClient.setQueryData(applicationQuery(application.id).queryKey, updated);
      void queryClient.invalidateQueries(historyQuery(application.id));
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        void queryClient.invalidateQueries(applicationQuery(application.id));
      }
    },
  });
  const conflict = submit.error instanceof ApiError && submit.error.code === 'CONFLICT';

  if (!editable) {
    const note = STATUS_NOTE[application.status as keyof typeof STATUS_NOTE];
    return (
      <Card glass stripe="accent">
        <CardHeader>
          <CardTitle>{m.detail_next_step()}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{note()}</CardContent>
      </Card>
    );
  }

  const complete = SubmissionHelper.isComplete(missing);
  return (
    <Card glass stripe={complete ? 'accent' : 'highlight'}>
      <CardHeader>
        <CardTitle>{m.detail_next_step()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {application.status === 'needs_info' && (
          <Alert tone="warning">{m.detail_needs_info_note()}</Alert>
        )}
        {complete ? (
          <p>{m.detail_ready_to_submit()}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">{m.detail_missing()}</p>
            <ul className="list-inside list-disc">
              {missing.documents.map((d) => (
                <li key={d.code}>
                  {m.detail_missing_document({ name: LocaleHelper.pick(d.nameNe, d.nameEn) })}
                </li>
              ))}
              {missing.fields.map((f) => (
                <li key={f.key}>
                  {m.detail_missing_field({ name: LocaleHelper.pick(f.labelNe, f.labelEn) })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {submit.isError && (
          <Alert>{conflict ? m.detail_conflict() : ApiErrorHelper.message(submit.error)}</Alert>
        )}
        <Button
          size="lg"
          className="self-start"
          disabled={!complete || submit.isPending}
          onClick={() => submit.mutate()}
        >
          <Send />
          {submit.isPending ? m.detail_submitting() : m.detail_submit()}
        </Button>
      </CardContent>
    </Card>
  );
}
