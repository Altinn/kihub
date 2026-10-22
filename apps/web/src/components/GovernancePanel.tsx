import { isExpired } from '@kihub/governance-core';
import { listAuditLog, listReviews, type Governance } from '@/lib/governance';
import {
  APPROVAL_LABELS,
  LIFECYCLE_LABELS,
  REVIEW_DECISION_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_TYPE_LABELS,
  RISK_LABELS,
  labelFor,
} from '@/lib/registry-view';

const dateFormat = new Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', dateStyle: 'long' });
const dateTimeFormat = new Intl.DateTimeFormat('nb-NO', {
  timeZone: 'Europe/Oslo',
  dateStyle: 'short',
  timeStyle: 'short',
});

/**
 * Read-only governance state for the employee surface — identical for every role, no action
 * controls (Constitution Principles VI & VIII). Governance actions are performed only in the
 * /cms editor back-office; internal notes and the featured flag are editor-only and never
 * rendered here.
 *
 * 026: Norwegian labels (FR-016), nb-NO dates in Oslo time, plain Designsystemet card/tag/paragraph
 * markup with no inline styles, and a `headingLevel` so the panel keeps a correct outline wherever
 * it is embedded (sub-headings are one level below).
 */
export async function GovernancePanel({
  artifactId,
  governance,
  headingLevel = 2,
}: {
  artifactId: string;
  governance: Governance;
  headingLevel?: 2 | 3 | 4;
}) {
  const [reviews, auditLog] = await Promise.all([listReviews(artifactId), listAuditLog(artifactId)]);
  const now = new Date();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const SubHeading = `h${headingLevel + 1}` as 'h3' | 'h4' | 'h5';

  return (
    <section className="ds-card app-panel" data-color="neutral" aria-labelledby="governance-heading">
      <Heading id="governance-heading" className="ds-heading" data-size="xs">
        Styring
      </Heading>

      <dl className="app-meta-list">
        <div>
          <dt>Livsløp</dt>
          <dd>{labelFor(LIFECYCLE_LABELS, governance.lifecycleState)}</dd>
        </div>
        <div>
          <dt>Vurderingsstatus</dt>
          <dd>{labelFor(REVIEW_STATUS_LABELS, governance.reviewStatus)}</dd>
        </div>
        <div>
          <dt>Godkjenning</dt>
          <dd>{labelFor(APPROVAL_LABELS, governance.approvalState)}</dd>
        </div>
        <div>
          <dt>Forretningseier</dt>
          <dd>{governance.businessOwner ?? '—'}</dd>
        </div>
        <div>
          <dt>Teknisk eier</dt>
          <dd>{governance.technicalOwner ?? '—'}</dd>
        </div>
        <div>
          <dt>Risikonivå</dt>
          <dd>{labelFor(RISK_LABELS, governance.riskLevel)}</dd>
        </div>
      </dl>

      <SubHeading className="ds-heading" data-size="2xs">
        Vurderinger
      </SubHeading>
      {reviews.length === 0 ? (
        <p className="ds-paragraph" data-size="sm">
          Ingen vurderinger registrert ennå.
        </p>
      ) : (
        <ul className="app-review-list">
          {reviews.map((r) => {
            const expired = r.expiryDate ? isExpired(r.expiryDate, now) : false;
            const reviewer = typeof r.reviewer === 'object' && r.reviewer ? r.reviewer.email : r.reviewer;
            const decisionColor =
              r.decision === 'rejected' ? 'danger' : r.decision === 'changes-requested' ? 'warning' : 'success';
            return (
              <li key={r.id} className="ds-card" data-color="neutral">
                <span className="app-cluster app-cluster--tight">
                  <span className="ds-tag" data-color="neutral">
                    {labelFor(REVIEW_TYPE_LABELS, r.type)}
                  </span>
                  <span className="ds-tag" data-color={r.decision ? decisionColor : 'neutral'}>
                    {r.decision ? labelFor(REVIEW_DECISION_LABELS, r.decision) : 'Venter'}
                  </span>
                  {expired ? (
                    <span className="ds-tag" data-color="danger">
                      Utløpt — må fornyes
                    </span>
                  ) : null}
                </span>
                <p className="ds-paragraph app-meta" data-size="sm">
                  {reviewer ? `${reviewer} · ` : ''}
                  utløper {r.expiryDate ? dateFormat.format(new Date(r.expiryDate)) : '—'}
                </p>
                {r.comments ? (
                  <p className="ds-paragraph" data-size="sm">
                    {r.comments}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <SubHeading className="ds-heading" data-size="2xs">
        Endringslogg
      </SubHeading>
      {auditLog.length === 0 ? (
        <p className="ds-paragraph" data-size="sm">
          Ingen styringshandlinger registrert ennå.
        </p>
      ) : (
        <ul className="app-audit-list">
          {auditLog.map((entry) => (
            <li key={entry.id} className="ds-paragraph" data-size="xs">
              <time dateTime={entry.createdAt}>{dateTimeFormat.format(new Date(entry.createdAt))}</time> —{' '}
              {entry.actor} — {entry.action}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
