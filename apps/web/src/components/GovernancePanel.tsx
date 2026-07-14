import { canTransition, hasPermission, isExpired, LIFECYCLE_STATES, type Role } from '@kihub/governance-core';
import { Button, Card, Checkbox, Heading, Label, Paragraph, Select, Tag, Textfield } from '@digdir/designsystemet-react';
import { ReviewForm } from '@/components/ReviewForm';
import { listAuditLog, listReviews, type Governance } from '@/lib/governance';
import {
  decideApprovalAction,
  submitForReviewAction,
  transitionLifecycleAction,
  updateGovernanceMetadataAction,
} from '@/lib/governance-actions';

const STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  experimental: 'Experimental',
  'in-review': 'In Review',
  approved: 'Approved',
  recommended: 'Recommended',
  deprecated: 'Deprecated',
  archived: 'Archived',
};

/**
 * Owners/risk/notes editing + role-gated lifecycle actions (US2). Actions the role does not
 * permit are simply not rendered (UX only) — the server action re-checks via Payload `access`
 * regardless (FR-003).
 */
export async function GovernancePanel({
  artifactId,
  governance,
  actorRole,
}: {
  artifactId: string;
  governance: Governance;
  actorRole: Role;
}) {
  const canEditMetadata = hasPermission(actorRole, 'edit-metadata');
  const canRecordReview = hasPermission(actorRole, 'record-review');
  const canDecideApproval = hasPermission(actorRole, 'decide-approval');
  const canSubmit =
    hasPermission(actorRole, 'submit-for-review') &&
    (governance.lifecycleState === 'draft' || governance.lifecycleState === 'experimental');

  const [reviews, auditLog] = await Promise.all([listReviews(artifactId), listAuditLog(artifactId)]);
  const now = new Date();

  // Reuse `canTransition` (the single source of truth) to enumerate which further transitions
  // this role may perform from the current state — never duplicate the FSM matrix here.
  const otherTransitions = LIFECYCLE_STATES.filter(
    (candidate) =>
      candidate !== 'in-review' &&
      canTransition(governance.lifecycleState, candidate, actorRole).allowed,
  );

  return (
    <Card style={{ marginTop: '1.5rem' }}>
      <Heading level={2} data-size="xs" style={{ marginBottom: '0.75rem' }}>
        Governance
      </Heading>

      {canEditMetadata ? (
        <form action={updateGovernanceMetadataAction} style={{ display: 'grid', gap: '0.75rem', maxWidth: '420px' }}>
          <input type="hidden" name="artifactId" value={artifactId} />
          <Textfield
            label="Business owner"
            name="businessOwner"
            defaultValue={governance.businessOwner ?? ''}
            data-size="sm"
          />
          <Textfield
            label="Technical owner"
            name="technicalOwner"
            defaultValue={governance.technicalOwner ?? ''}
            data-size="sm"
          />
          <div>
            <Label htmlFor="riskLevel">Risk level</Label>
            <Select id="riskLevel" name="riskLevel" defaultValue={governance.riskLevel ?? ''} data-size="sm">
              <option value="">Not set</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <Textfield
            label="Internal notes"
            name="internalNotes"
            multiline
            defaultValue={governance.internalNotes ?? ''}
            data-size="sm"
          />
          <Checkbox label="Featured" name="featured" value="on" defaultChecked={governance.featured} />
          <Button type="submit" data-size="sm" style={{ justifySelf: 'start' }}>
            Save
          </Button>
        </form>
      ) : (
        <div>
          <Paragraph data-size="sm">Business owner: {governance.businessOwner ?? '—'}</Paragraph>
          <Paragraph data-size="sm">Technical owner: {governance.technicalOwner ?? '—'}</Paragraph>
          <Paragraph data-size="sm">Risk level: {governance.riskLevel ?? '—'}</Paragraph>
        </div>
      )}

      {(canSubmit || otherTransitions.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          {canSubmit ? (
            <form action={submitForReviewAction}>
              <input type="hidden" name="artifactId" value={artifactId} />
              <Button type="submit" data-size="sm" variant="secondary">
                Submit for review
              </Button>
            </form>
          ) : null}
          {otherTransitions.map((to) => (
            <form key={to} action={transitionLifecycleAction}>
              <input type="hidden" name="artifactId" value={artifactId} />
              <input type="hidden" name="to" value={to} />
              <Button type="submit" data-size="sm" variant="secondary">
                Move to {STATE_LABELS[to]}
              </Button>
            </form>
          ))}
        </div>
      )}

      {canDecideApproval ? (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <form action={decideApprovalAction}>
            <input type="hidden" name="artifactId" value={artifactId} />
            <input type="hidden" name="decision" value="approved" />
            <Button type="submit" data-size="sm">
              Approve
            </Button>
          </form>
          <form action={decideApprovalAction}>
            <input type="hidden" name="artifactId" value={artifactId} />
            <input type="hidden" name="decision" value="rejected" />
            <Button type="submit" data-size="sm" variant="secondary" data-color="danger">
              Reject
            </Button>
          </form>
        </div>
      ) : null}

      <Heading level={3} data-size="2xs" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
        Reviews
      </Heading>
      {reviews.length === 0 ? (
        <Paragraph data-size="sm">No reviews recorded yet.</Paragraph>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {reviews.map((r) => {
            const expired = r.expiryDate ? isExpired(r.expiryDate, now) : false;
            const reviewer = typeof r.reviewer === 'object' && r.reviewer ? r.reviewer.email : r.reviewer;
            return (
              <div key={r.id} style={{ border: '1px solid var(--ds-color-neutral-border-subtle, #ddd)', borderRadius: '4px', padding: '0.5rem 0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Tag data-color="neutral" data-size="sm">
                    {r.type}
                  </Tag>
                  <Tag data-color={r.decision === 'rejected' ? 'danger' : r.decision === 'changes-requested' ? 'warning' : 'success'} data-size="sm">
                    {r.decision ?? 'pending'}
                  </Tag>
                  {expired ? (
                    <Tag data-color="danger" data-size="sm">
                      Expired — needs renewal
                    </Tag>
                  ) : null}
                </div>
                <Paragraph data-size="sm" style={{ marginTop: '0.25rem' }}>
                  {reviewer ? `${reviewer} · ` : ''}
                  expires {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—'}
                </Paragraph>
                {r.comments ? <Paragraph data-size="sm">{r.comments}</Paragraph> : null}
              </div>
            );
          })}
        </div>
      )}

      {canRecordReview ? (
        <div style={{ marginTop: '1rem' }}>
          <ReviewForm artifactId={artifactId} />
        </div>
      ) : null}

      <Heading level={3} data-size="2xs" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
        Audit history
      </Heading>
      {auditLog.length === 0 ? (
        <Paragraph data-size="sm">No governance actions recorded yet.</Paragraph>
      ) : (
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          {auditLog.map((entry) => (
            <Paragraph key={entry.id} data-size="xs">
              {new Date(entry.createdAt).toLocaleString()} — {entry.actor} — {entry.action}
            </Paragraph>
          ))}
        </div>
      )}
    </Card>
  );
}
