import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { Ribbon } from '@/components/ui/ribbon.tsx';
import { DateTimeHelper } from '@/lib/date-time.helper.ts';
import { FileViewHelper } from '@/lib/file-view.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { ApplicationsApi, letterQuery } from './queries.ts';

interface LetterCardProps {
  applicationId: number;
}

export function LetterCard({ applicationId }: LetterCardProps) {
  const { data: letter } = useQuery(letterQuery(applicationId));
  const download = useMutation({
    mutationFn: () => ApplicationsApi.letterPdf(applicationId),
    onSuccess: FileViewHelper.open,
  });
  if (!letter) return null;

  return (
    <Card glass stripe="accent">
      <Ribbon tone="accent">{m.status_issued()}</Ribbon>
      <CardHeader>
        <CardTitle>{m.letter_heading()}</CardTitle>
        <CardDescription>{m.letter_verify_note()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{m.letter_number()}</dt>
          <dd className="font-semibold">{LocaleHelper.digits(letter.letterNo)}</dd>
          <dt className="text-muted-foreground">{m.letter_date()}</dt>
          <dd>{DateTimeHelper.bsDay(letter.issuedDateBs)}</dd>
          <dt className="text-muted-foreground">{m.letter_code()}</dt>
          <dd className="font-mono tracking-wider">{letter.verificationCode}</dd>
        </dl>
        {letter.pdfReady ? (
          <Button
            onClick={() => download.mutate()}
            disabled={download.isPending}
            className="self-start"
          >
            <Download />
            {m.letter_download()}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
            {m.letter_preparing()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
