import config from '@payload-config';
import { getPayload } from 'payload';
import { triggerDiscoveryAction } from '@/lib/discovery-actions';
import type { DiscoverySource } from '@/payload-types';

/**
 * "Run now" scan triggers for the Discovery Sources list view in /cms — the successor to the
 * employee-app `/admin/discovery` page, moved here so ALL admin actions live in the back-office
 * (Principle VIII, same rationale as the 008 governance-UI reconcile). Rendered via
 * `admin.components.beforeListTable`, so it only appears inside the admin list view, which the
 * collection's `access.read` already restricts to Admins; the action itself re-checks the live
 * actor inside `triggerDiscovery` (SC-008).
 */
export async function DiscoveryScanPanel() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'discovery-sources',
    sort: 'name',
    limit: 200,
    overrideAccess: true,
  });
  const sources = docs as DiscoverySource[];
  if (sources.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '1rem',
      }}
    >
      {sources.map((s) => {
        const running = Boolean(s.runningSince);
        return (
          <form key={s.id} action={triggerDiscoveryAction} style={{ display: 'contents' }}>
            <input type="hidden" name="sourceId" value={String(s.id)} />
            <button
              type="submit"
              disabled={running || s.enabled === false}
              className="btn btn--style-secondary btn--size-small"
              title={`${s.repo}@${s.ref ?? 'main'}`}
            >
              {running ? `Scanning ${s.name}…` : `Run scan: ${s.name}`}
            </button>
          </form>
        );
      })}
      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
        Runs a full scan of the source now; results appear under Discovery Runs.
      </span>
    </div>
  );
}
