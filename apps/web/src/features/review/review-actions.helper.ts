import type { ApplicationStatus } from '@/components/status-badge.tsx';
import type { Role } from '@/features/auth/session.ts';
import type { ReviewAction } from './types.ts';

interface ActionRule {
  from: ApplicationStatus;
  roles: Role[];
  note: 'required' | 'optional' | 'none';
}

// Mirrors TRANSITIONS in the API's review.service.ts; the server still has the final say.
const RULES: Record<ReviewAction, ActionRule> = {
  under_review: { from: 'submitted', roles: ['ward_secretary'], note: 'none' },
  approved: { from: 'under_review', roles: ['ward_chair'], note: 'optional' },
  needs_info: { from: 'under_review', roles: ['ward_secretary', 'ward_chair'], note: 'required' },
  rejected: { from: 'under_review', roles: ['ward_secretary', 'ward_chair'], note: 'required' },
  issue: { from: 'approved', roles: ['ward_secretary', 'ward_chair'], note: 'none' },
};

export class ReviewActionsHelper {
  static available(role: Role, status: ApplicationStatus): ReviewAction[] {
    return (Object.keys(RULES) as ReviewAction[]).filter(
      (action) => RULES[action].from === status && RULES[action].roles.includes(role),
    );
  }

  static note(action: ReviewAction): ActionRule['note'] {
    return RULES[action].note;
  }
}
