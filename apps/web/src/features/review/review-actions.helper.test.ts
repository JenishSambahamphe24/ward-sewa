import { describe, expect, it } from 'vitest';
import { ReviewActionsHelper } from './review-actions.helper.ts';

describe('ReviewActionsHelper.available', () => {
  it.each([
    ['ward_secretary', 'submitted', ['under_review']],
    ['ward_chair', 'submitted', []],
    ['ward_secretary', 'under_review', ['needs_info', 'rejected']],
    ['ward_chair', 'under_review', ['approved', 'needs_info', 'rejected']],
    ['ward_secretary', 'approved', ['issue']],
    ['ward_chair', 'approved', ['issue']],
    ['ward_chair', 'issued', []],
  ] as const)('%s on %s → %j', (role, status, expected) => {
    expect(ReviewActionsHelper.available(role, status)).toEqual(expected);
  });

  it('requires a note only where the citizen needs a reason', () => {
    expect(ReviewActionsHelper.note('rejected')).toBe('required');
    expect(ReviewActionsHelper.note('needs_info')).toBe('required');
    expect(ReviewActionsHelper.note('approved')).toBe('optional');
    expect(ReviewActionsHelper.note('issue')).toBe('none');
  });
});
