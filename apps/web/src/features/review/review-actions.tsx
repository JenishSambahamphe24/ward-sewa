import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, FileSignature, MessageSquareWarning, PlayCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { historyQuery, letterQuery } from '@/features/applications/queries.ts';
import type { Application } from '@/features/applications/types.ts';
import type { Role } from '@/features/auth/session.ts';
import { ApiError } from '@/lib/api-client.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { m } from '@/paraglide/messages.js';
import { QUEUE_KEY, ReviewApi, staffApplicationQuery } from './queries.ts';
import { ReviewActionsHelper } from './review-actions.helper.ts';
import type { ReviewAction } from './types.ts';

interface ActionCopy {
  label: () => string;
  title: () => string;
  body: () => string;
  icon: LucideIcon;
  variant: 'default' | 'accent' | 'outline' | 'danger';
}

const COPY: Record<ReviewAction, ActionCopy> = {
  under_review: {
    label: m.review_start,
    title: m.review_start_title,
    body: m.review_start_body,
    icon: PlayCircle,
    variant: 'accent',
  },
  approved: {
    label: m.review_approve,
    title: m.review_approve_title,
    body: m.review_approve_body,
    icon: CheckCheck,
    variant: 'default',
  },
  issue: {
    label: m.review_issue,
    title: m.review_issue_title,
    body: m.review_issue_body,
    icon: FileSignature,
    variant: 'accent',
  },
  needs_info: {
    label: m.review_needs_info,
    title: m.review_needs_info_title,
    body: m.review_needs_info_body,
    icon: MessageSquareWarning,
    variant: 'outline',
  },
  rejected: {
    label: m.review_reject,
    title: m.review_reject_title,
    body: m.review_reject_body,
    icon: XCircle,
    variant: 'danger',
  },
};

interface ReviewActionsProps {
  application: Application;
  role: Role;
}

export function ReviewActions({ application, role }: ReviewActionsProps) {
  const noteId = useId();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState('');
  const actions = ReviewActionsHelper.available(role, application.status);
  const noteRule = action ? ReviewActionsHelper.note(action) : 'none';
  const detailKey = staffApplicationQuery(application.id).queryKey;

  const act = useMutation({
    mutationFn: async (chosen: ReviewAction) => {
      if (chosen === 'issue') {
        await ReviewApi.issue(application.id, application.version);
        return null;
      }
      return ReviewApi.transition(application.id, chosen, application.version, note.trim());
    },
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(detailKey, updated);
      else void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries(historyQuery(application.id));
      void queryClient.invalidateQueries(letterQuery(application.id));
      void queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
      setAction(null);
    },
    // 409: a colleague acted first. Reload so the buttons match the real status.
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        void queryClient.invalidateQueries({ queryKey: detailKey });
      }
    },
  });
  const conflict = act.error instanceof ApiError && act.error.code === 'CONFLICT';

  const open = (chosen: ReviewAction) => {
    setNote('');
    act.reset();
    setAction(chosen);
  };

  return (
    <Card glass stripe="accent">
      <CardHeader>
        <CardTitle>{m.review_actions_heading()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.review_no_action()}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((available) => {
              const { label, icon: Icon, variant } = COPY[available];
              return (
                <Button key={available} variant={variant} onClick={() => open(available)}>
                  <Icon />
                  {label()}
                </Button>
              );
            })}
          </div>
        )}
        {conflict && action === null && <Alert>{m.review_conflict()}</Alert>}
      </CardContent>

      <Dialog open={action !== null} onOpenChange={(isOpen) => !isOpen && setAction(null)}>
        {action && (
          <DialogContent closeLabel={m.action_close()}>
            <DialogTitle>{COPY[action].title()}</DialogTitle>
            <DialogDescription>{COPY[action].body()}</DialogDescription>
            {noteRule !== 'none' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={noteId}>
                  {noteRule === 'required' ? m.review_note_required() : m.review_note_optional()}
                </Label>
                <Textarea
                  id={noteId}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            )}
            {act.isError && (
              <Alert>{conflict ? m.review_conflict() : ApiErrorHelper.message(act.error)}</Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAction(null)}>
                {m.action_cancel()}
              </Button>
              <Button
                variant={COPY[action].variant === 'outline' ? 'default' : COPY[action].variant}
                disabled={act.isPending || (noteRule === 'required' && note.trim() === '')}
                onClick={() => act.mutate(action)}
              >
                {COPY[action].label()}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
