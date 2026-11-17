import Link from 'next/link';

export interface Crumb {
  label: string;
  href: string;
}

/**
 * 026 — Designsystemet's Breadcrumbs, rendered as its `<ds-breadcrumbs>` web component (from
 * `@digdir/designsystemet-web`, loaded once in the shell) — the same element Designsystemet's React
 * `Breadcrumbs` renders. Designsystemet's CSS shows the full trail on wide screens and only the
 * back link to the parent on narrow ones (it draws the chevrons). The element keeps the semantics
 * in step with what is visible: it sets `role="navigation"` and the label while the trail shows,
 * removes them when only the back link does, and marks the last link `aria-current="page"`.
 *
 * Those attributes are also rendered on the server, so the trail is a labelled navigation with a
 * current page before (or without) client-side scripting; `suppressHydrationWarning` covers the
 * element updating them, as Designsystemet's React components do.
 *
 * `trail` is the ancestors, outermost first; `current` is this page.
 */
export function Breadcrumbs({ trail, current }: { trail: Crumb[]; current: Crumb }) {
  const parent = trail[trail.length - 1];
  return (
    <ds-breadcrumbs
      className="ds-breadcrumbs app-breadcrumbs"
      role="navigation"
      aria-label="Du er her"
      suppressHydrationWarning
    >
      {parent ? (
        <Link href={parent.href} className="ds-link" suppressHydrationWarning>
          {parent.label}
        </Link>
      ) : null}
      <ol>
        {trail.map((crumb) => (
          <li key={crumb.href}>
            <Link href={crumb.href} className="ds-link" suppressHydrationWarning>
              {crumb.label}
            </Link>
          </li>
        ))}
        <li>
          <Link href={current.href} className="ds-link" aria-current="page" suppressHydrationWarning>
            {current.label}
          </Link>
        </li>
      </ol>
    </ds-breadcrumbs>
  );
}
