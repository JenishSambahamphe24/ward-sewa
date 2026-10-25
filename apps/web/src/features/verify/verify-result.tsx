import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { ApiError } from '@/lib/api-client.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { DateTimeHelper } from '@/lib/date-time.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { verifyQuery } from './queries.ts';

interface VerifyResultProps {
  code: string;
}

export function VerifyResult({ code }: VerifyResultProps) {
  const { data: letter, error, isPending } = useQuery(verifyQuery(code));

  if (isPending) return <p className="py-6 text-center text-muted-foreground">{m.loading()}</p>;

  const notFound =
    error instanceof ApiError && (error.code === 'NOT_FOUND' || error.code === 'VALIDATION_FAILED');
  if (notFound) {
    return (
      <Card glass>
        <CardHeader className="flex-row items-center gap-3">
          <ShieldAlert className="size-8 shrink-0 text-danger" aria-hidden />
          <div className="flex flex-col gap-1">
            <CardTitle>{m.verify_not_found_title()}</CardTitle>
            <CardDescription>{m.verify_not_found_body()}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }
  if (!letter) return <Alert>{ApiErrorHelper.message(error)}</Alert>;

  const rows = [
    [m.letter_number(), LocaleHelper.digits(letter.letterNo)],
    [m.letter_date(), DateTimeHelper.bsDay(letter.issuedDateBs)],
    [m.verify_applicant(), letter.applicantName],
    [
      m.verify_letter_type(),
      LocaleHelper.pick(letter.serviceType.nameNe, letter.serviceType.nameEn),
    ],
    [
      m.verify_issued_by(),
      m.verify_issued_by_value({
        localLevel: letter.issuedBy.localLevel,
        ward: LocaleHelper.digits(letter.issuedBy.wardNo),
      }),
    ],
  ] as const;

  return (
    <Card glass stripe="accent">
      <CardHeader className="flex-row items-center gap-3">
        <BadgeCheck className="size-8 shrink-0 text-success" aria-hidden />
        <div className="flex flex-col gap-1">
          <CardTitle>{m.verify_valid_title()}</CardTitle>
          <CardDescription>{m.verify_valid_body()}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
