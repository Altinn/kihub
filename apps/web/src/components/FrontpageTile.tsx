import Link from 'next/link';
import type { Tile } from '@/lib/site-content-defaults';

/**
 * 011 US1 — one of the two hero navigation tiles (contracts/frontpage-read.md). The WHOLE tile is
 * a single link (`.kihub-tile`), so it is one tab stop with no nested interactive elements
 * (FR-004/014). Content (tag, title, destination, variant) is editor-managed.
 */
export function FrontpageTile({ tile }: { tile: Tile }) {
  const accent = tile.variant === 'accent';
  return (
    <Link
      href={tile.href}
      className={`kihub-tile${accent ? ' kihub-tile--accent' : ''}`}
      style={{ minHeight: '220px' }}
    >
      {tile.tag ? (
        <span
          className={`kihub-tag${accent ? ' kihub-tag--on-accent' : ''}`}
          style={{ alignSelf: 'flex-start' }}
        >
          {tile.tag}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      <span className="kihub-tile__title">
        {tile.title}
        <span className="kihub-tile__arrow" aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
