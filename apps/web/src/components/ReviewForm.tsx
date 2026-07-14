import { REVIEW_TYPES } from '@kihub/governance-core';
import { Button, Field, Label, Select, Textfield } from '@digdir/designsystemet-react';
import { recordReviewAction } from '@/lib/governance-actions';

const TYPE_LABELS: Record<string, string> = {
  security: 'Security',
  'privacy-gdpr': 'Privacy / GDPR',
  technical: 'Technical',
  accessibility: 'Accessibility',
  'responsible-ai': 'Responsible AI',
  operational: 'Operational',
};

/** Reviewer+ records a typed review (FR-014, FR-015). */
export function ReviewForm({ artifactId }: { artifactId: string }) {
  return (
    <form action={recordReviewAction} style={{ display: 'grid', gap: '0.75rem', maxWidth: '420px' }}>
      <input type="hidden" name="artifactId" value={artifactId} />
      <Field>
        <Label htmlFor="review-type">Review type</Label>
        <Select id="review-type" name="type" data-size="sm" required>
          {REVIEW_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor="review-decision">Decision</Label>
        <Select id="review-decision" name="decision" data-size="sm" required>
          <option value="approved">Approved</option>
          <option value="changes-requested">Changes requested</option>
          <option value="rejected">Rejected</option>
        </Select>
      </Field>
      <Field>
        <Label htmlFor="review-risk">Risk level</Label>
        <Select id="review-risk" name="riskLevel" data-size="sm">
          <option value="">Not set</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </Field>
      <Textfield label="Comments" name="comments" multiline data-size="sm" />
      <Textfield label="Required changes" name="requiredChanges" multiline data-size="sm" />
      <Textfield label="Expiry date" name="expiryDate" type="date" data-size="sm" required />
      <Button type="submit" data-size="sm" style={{ justifySelf: 'start' }}>
        Record review
      </Button>
    </form>
  );
}
