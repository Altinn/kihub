import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface HomeWidgetProps {
  title: string;
  /** Module list this widget links to (e.g. `/news`). */
  viewAllHref: string;
  viewAllLabel?: string;
  /** When true, render `emptyMessage` instead of `children` (never an error or a blank gap). */
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

/**
 * Generic home-dashboard widget (Designsystemet): a heading, a "View all →" link into the module,
 * and either the card list (`children`) or a friendly empty state (FR-003/005). The "View all →"
 * link is shown even when the widget's curated slice is empty, since the module may still have a
 * full list.
 */
export function HomeWidget({
  title,
  viewAllHref,
  viewAllLabel = 'View all →',
  isEmpty,
  emptyMessage,
  children,
}: HomeWidgetProps) {
  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '1rem',
        }}
      >
        <Heading level={2} data-size="sm">
          {title}
        </Heading>
        <Paragraph data-size="sm">
          <Link href={viewAllHref}>{viewAllLabel}</Link>
        </Paragraph>
      </div>
      {isEmpty ? (
        <Card>
          <Paragraph data-size="sm">{emptyMessage}</Paragraph>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>{children}</div>
      )}
    </section>
  );
}
