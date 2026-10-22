import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { AddressPicker, EMPTY_ADDRESS } from './address-picker.tsx';
import type { AddressValue } from './address-picker.tsx';
import { ApplicationFieldsHelper } from './application-fields.helper.ts';
import { DynamicFields } from './dynamic-fields.tsx';
import { ApplicationsApi } from './queries.ts';
import { ServiceTypePicker } from './service-type-picker.tsx';
import type { Application, ServiceType } from './types.ts';

interface StepProps {
  number: number;
  title: string;
  children: ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <Card glass>
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {LocaleHelper.digits(number)}
        </span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

interface NewApplicationFormProps {
  onCreated: (application: Application) => void;
}

export function NewApplicationForm({ onCreated }: NewApplicationFormProps) {
  const id = useId();
  // One key per form: a double tap or a retry on a bad connection creates one application.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [tole, setTole] = useState('');
  const [houseNo, setHouseNo] = useState('');

  const fields = serviceType?.formFields ?? [];
  const localErrors = ApplicationFieldsHelper.errors(fields, values);
  const create = useMutation({
    mutationFn: () =>
      ApplicationsApi.create(
        {
          serviceTypeId: serviceType?.id ?? 0,
          localLevelCode: address.localLevelCode,
          wardNo: Number(address.wardNo),
          tole: tole.trim(),
          ...(houseNo.trim() ? { houseNo: houseNo.trim() } : {}),
          formData: ApplicationFieldsHelper.payload(fields, values),
        },
        idempotencyKey,
      ),
    onSuccess: (application) => onCreated(application),
  });
  const serverErrors = ApiErrorHelper.fieldErrors(create.error);
  const errors = { ...serverErrors, ...localErrors };
  const ready =
    serviceType !== null &&
    address.wardNo !== '' &&
    tole.trim() !== '' &&
    Object.keys(localErrors).length === 0;

  const changeAddress = (next: AddressValue) => {
    if (next.localLevelCode !== address.localLevelCode) {
      setServiceType(null);
      setValues({});
    }
    setAddress(next);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Step number={1} title={m.apply_step_address()}>
        <AddressPicker value={address} onChange={changeAddress} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-tole`}>
              {m.address_tole()}
              <span className="text-danger"> *</span>
            </Label>
            <Input
              id={`${id}-tole`}
              value={tole}
              onChange={(event) => setTole(event.target.value)}
              aria-invalid={errors.tole !== undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-house`}>{m.address_house_no()}</Label>
            <Input
              id={`${id}-house`}
              value={houseNo}
              onChange={(event) => setHouseNo(event.target.value)}
              aria-invalid={errors.houseNo !== undefined}
            />
          </div>
        </div>
      </Step>

      <Step number={2} title={m.apply_step_service()}>
        <ServiceTypePicker
          localLevelCode={address.localLevelCode}
          value={serviceType}
          onChange={(next) => {
            setServiceType(next);
            setValues({});
          }}
        />
      </Step>

      {fields.length > 0 && (
        <Step number={3} title={m.apply_step_details()}>
          <DynamicFields
            fields={fields}
            values={values}
            errors={errors}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
          />
        </Step>
      )}

      {create.isError && <Alert>{ApiErrorHelper.message(create.error)}</Alert>}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{m.apply_draft_note()}</p>
        <Button type="submit" size="lg" disabled={!ready || create.isPending}>
          {create.isPending ? m.apply_saving() : m.apply_save_draft()}
        </Button>
      </div>
    </form>
  );
}
