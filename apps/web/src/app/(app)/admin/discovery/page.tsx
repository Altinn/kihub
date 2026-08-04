import { hasPermission, type Role } from '@kihub/governance-core';
import {
  Heading,
  Paragraph,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@digdir/designsystemet-react';
import config from '@payload-config';
import { getPayload } from 'payload';
import { notFound } from 'next/navigation';
import { DiscoveryRunSummary } from '@/components/DiscoveryRunSummary';
import { DiscoverySourceCard } from '@/components/DiscoverySourceCard';
import { getCurrentActor } from '@/lib/governance';
import type { DiscoveryRun, DiscoverySource } from '@/payload-types';

/**
 * Admin-only discovery operations page (FR-011/FR-012). Server-side gated via `hasPermission` — a
 * non-Admin reaching this URL directly gets `notFound()`, not just a hidden nav link (FR-013).
 * Shows each source's connection status + last run, a "Run now" trigger, and recent run history.
 */
export default async function DiscoveryAdminPage() {
  const actor = await getCurrentActor();
  // Only Admin holds `manage-roles`; reuse it as the Admin gate for discovery operations.
  if (!actor || !hasPermission(actor.role as Role, 'manage-roles')) {
    notFound();
  }

  const payload = await getPayload({ config });
  const [{ docs: sources }, { docs: runs }] = await Promise.all([
    payload.find({ collection: 'discovery-sources', sort: 'name', limit: 200, overrideAccess: true }),
    payload.find({ collection: 'discovery-runs', sort: '-startedAt', limit: 50, overrideAccess: true, depth: 1 }),
  ]);

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Heading level={1} data-size="md" style={{ marginBottom: '0.5rem' }}>
        Automated discovery
      </Heading>
      <Paragraph data-size="sm" style={{ marginBottom: '1.5rem' }}>
        Sources are scanned automatically on push (webhook) and on a schedule. Use “Run now” to
        trigger an immediate scan — the successor to the maintainer CLI.
      </Paragraph>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {(sources as DiscoverySource[]).map((s) => (
          <DiscoverySourceCard key={s.id} source={s} />
        ))}
        {sources.length === 0 ? (
          <Paragraph data-size="sm">No sources configured yet.</Paragraph>
        ) : null}
      </section>

      <Heading level={2} data-size="sm" style={{ marginBottom: '0.75rem' }}>
        Recent runs
      </Heading>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Started</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Result</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(runs as DiscoveryRun[]).map((run) => {
            const source = run.source;
            const sourceName = typeof source === 'object' && source ? source.name : String(source);
            return (
              <TableRow key={run.id}>
                <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
                <TableCell>{sourceName}</TableCell>
                <TableCell>
                  <DiscoveryRunSummary run={run} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {runs.length === 0 ? (
        <Paragraph data-size="sm" style={{ marginTop: '0.75rem' }}>
          No discovery runs yet.
        </Paragraph>
      ) : null}
    </main>
  );
}
