import { Button, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { triggerDiscoveryAction } from '@/lib/discovery-actions';
import type { DiscoverySource } from '@/payload-types';

/** One source's connection status + last-run outcome, with an Admin "Run now" trigger (FR-011/FR-012). */
export function DiscoverySourceCard({ source }: { source: DiscoverySource }) {
  const lastRun = source.lastRunAt ? new Date(source.lastRunAt).toLocaleString() : 'never';
  const running = Boolean(source.runningSince);

  return (
    <div
      style={{
        border: '1px solid var(--ds-color-neutral-border-subtle, #ccc)',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Heading level={2} data-size="xs" style={{ margin: 0 }}>
          {source.name}
        </Heading>
        {source.enabled ? (
          <Tag data-color="success" data-size="sm">
            Enabled
          </Tag>
        ) : (
          <Tag data-color="neutral" data-size="sm">
            Disabled
          </Tag>
        )}
        {running ? (
          <Tag data-color="info" data-size="sm">
            Running…
          </Tag>
        ) : null}
      </div>

      <Paragraph data-size="sm" style={{ margin: 0 }}>
        {source.repo}@{source.ref ?? 'main'}
      </Paragraph>
      <Paragraph data-size="sm" style={{ margin: 0 }}>
        Last run: {lastRun}
        {source.lastRunOutcome ? ` (${source.lastRunOutcome})` : ''}
      </Paragraph>

      <form action={triggerDiscoveryAction}>
        <input type="hidden" name="sourceId" value={String(source.id)} />
        <Button type="submit" data-size="sm" variant="secondary" disabled={running}>
          Run now
        </Button>
      </form>
    </div>
  );
}
