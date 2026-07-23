import { isExpired } from '@kihub/governance-core';
import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { listAuditLog, listReviews, type Governance } from '@/lib/governance';

const STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  experimental: 'Experimental',
  'in-review': 'In Review',
  approved: 'Approved',
  recommended: 'Recommended',
  deprecated: 'Deprecated',
  archived: 'Archived',
};

const REVIEW_STATUS_LABELS: Record<Governance['reviewStatus'], string> = {
  'not-submitted': 'Not submitted',
  'in-review': 'In review',
};

const APPROVAL_LABELS: Record<Governance['approvalState'], string> = {
  'not-approved': 'Not approved',
  approved: 'Approved',
  rejected: 'Rejected',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Read-only governance state for the employee surface — identical for every role, no action
 * controls (Constitution Principles VI & VIII). Governance actions are performed only in the
 * /cms editor back-office; internal notes and the featured flag are editor-only and never
 * rendered here.
 */
export async function GovernancePanel({
  artifactId,
  governance,
}: {
  artifactId: string;
  governance: Governance;
}) {
  const [reviews, auditLog] = await Promise.all([listReviews(artifactId), listAuditLog(artifactId)]);
  const now = new Date();

  return (
    <Card style={{ marginTop: '1.5rem' }}>
      <Heading level={2} data-size="xs" style={{ marginBottom: '0.75rem' }}>
        Governance
      </Heading>

      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.4rem 1.25rem', margin: 0 }}>
        <dt><strong>Lifecycle state</strong></dt>
        <dd style={{ margin: 0 }}>{STATE_LABELS[governance.lifecycleState] ?? governance.lifecycleState}</dd>
        <dt><strong>Review status</strong></dt>
        <dd style={{ margin: 0 }}>{REVIEW_STATUS_LABELS[governance.reviewStatus]}</dd>
        <dt><strong>Approval</strong></dt>
        <dd style={{ margin: 0 }}>{APPROVAL_LABELS[governance.approvalState]}</dd>
        <dt><strong>Business owner</strong></dt>
        <dd style={{ margin: 0 }}>{governance.businessOwner ?? '—'}</dd>
        <dt><strong>Technical owner</strong></dt>
        <dd style={{ margin: 0 }}>{governance.technicalOwner ?? '—'}</dd>
        <dt><strong>Risk level</strong></dt>
        <dd style={{ margin: 0 }}>{governance.riskLevel ? RISK_LABELS[governance.riskLevel] : '—'}</dd>
      </dl>

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
