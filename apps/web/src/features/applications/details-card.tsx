import { DivisionHelper } from '@ward-sewa/nepal-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { ApiError } from '@/lib/api-client.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { ApplicationFieldsHelper } from './application-fields.helper.ts';
import { DynamicFields } from './dynamic-fields.tsx';
import { ApplicationsApi, applicationQuery } from './queries.ts';
import type { Application, FormField } from './types.ts';

interface DetailsCardProps {
  application: Application;
  formFields: readonly FormField[];
  editable: boolean;
}

export function DetailsCard({ application, formFields, editable }: DetailsCardProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(application.formData);
  const localLevel = DivisionHelper.getLocalLevel(application.address.localLevelCode);
  const localErrors = ApplicationFieldsHelper.errors(formFields, values);

  const save = useMutation({
    mutationFn: () =>
      ApplicationsApi.update(application.id, {
        version: application.version,
        formData: ApplicationFieldsHelper.payload(formFields, values),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(applicationQuery(application.id).queryKey, updated);
      setEditing(false);
    },
    // 409: someone saved first (another tab or device); reload so the next try uses the new version.
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        void queryClient.invalidateQueries(applicationQuery(application.id));
      }
    },
  });
  const conflict = save.error instanceof ApiError && save.error.code === 'CONFLICT';
  const address = [
    localLevel?.name,
    `${m.address_ward()} ${LocaleHelper.digits(application.address.wardNo)}`,
    application.address.tole,
    application.address.houseNo,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{m.details_heading()}</CardTitle>
        {editable && !editing && formFields.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil />
            {m.details_edit()}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">{m.details_address()}</dt>
          <dd>{address}</dd>
          {!editing &&
            formFields.map((field) => (
              <div key={field.key} className="contents">
                <dt className="text-muted-foreground">
                  {LocaleHelper.pick(field.labelNe, field.labelEn)}
                </dt>
                <dd>
                  {application.formData[field.key] ? (
                    LocaleHelper.digits(application.formData[field.key] ?? '')
                  ) : (
                    <span className="text-muted-foreground italic">{m.details_not_filled()}</span>
                  )}
                </dd>
              </div>
            ))}
        </dl>
        {editing && (
          <>
            <DynamicFields
              fields={formFields}
              values={values}
              errors={{ ...ApiErrorHelper.fieldErrors(save.error), ...localErrors }}
              onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            />
            {save.isError && (
              <Alert>{conflict ? m.detail_conflict() : ApiErrorHelper.message(save.error)}</Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setValues(application.formData);
                  setEditing(false);
                  save.reset();
                }}
              >
                {m.action_cancel()}
              </Button>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || Object.keys(localErrors).length > 0}
              >
                {m.profile_save()}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
