import Link from 'next/link';
import { tileAppearance } from '@/lib/frontpage-view';
import type { Tile } from '@/lib/site-content-defaults';

/**
 * 011 US1 — one of the hero navigation tiles (contracts/frontpage-read.md). The WHOLE tile is a
 * single link, so it is one tab stop with no nested interactive elements (FR-004/014). Content
 * (tag, title, destination, variant) is editor-managed.
 *
 * 026: a Designsystemet link card (`a.ds-card`) on a light Digdir tint, like digdir.no's
 * "Hva skal du gjøre?" cards: underlined title as the link cue, Designsystemet's hover and focus.
 * The stored variant (unchanged, no migration) picks the tint.
 */
export function FrontpageTile({ tile }: { tile: Tile }) {
  const { color } = tileAppearance(tile.variant);
  return (
    <Link href={tile.href} className="ds-card app-tile app-tint" data-variant="tinted" data-color={color}>
      {tile.tag ? (
        <span className="ds-tag" data-color="neutral" data-variant="outline">
          {tile.tag}
        </span>
      ) : null}
      {/* h3: the tiles sit in the frontpage's visually hidden "Snarveier" h2 section. */}
      <h3 className="ds-heading" data-size="sm">
        {tile.title}
      </h3>
    </Link>
  );
}
