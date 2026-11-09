import { ArrowRightIcon } from '@navikt/aksel-icons';
import Link from 'next/link';
import { tileAppearance } from '@/lib/frontpage-view';
import type { Tile } from '@/lib/site-content-defaults';

/**
 * 011 US1 — one of the hero navigation tiles (contracts/frontpage-read.md). The WHOLE tile is a
 * single link, so it is one tab stop with no nested interactive elements (FR-004/014). Content
 * (tag, title, destination, variant) is editor-managed.
 *
 * 026 (review revision): the solid Rød / Gul tiles of 025 are kept — the front page's strongest
 * navigation — on Designsystemet tokens: a link card (`a.ds-card.app-solid`) whose surface is the
 * colour's `base-default` with its generated `base-contrast-default` text (black, ≈7:1 on Rød,
 * ≈10:1 on Gul). As in 025, a Blåsvart tag sits at the top and a Blåsvart arrow chip follows the
 * title as the link cue. The stored variant (unchanged, no migration) picks the colour.
 */
export function FrontpageTile({ tile }: { tile: Tile }) {
  const { color } = tileAppearance(tile.variant);
  return (
    <Link href={tile.href} className="ds-card app-tile app-solid" data-color={color}>
      {tile.tag ? (
        <span className="ds-tag" data-color="neutral">
          {tile.tag}
        </span>
      ) : null}
      {/* h3: the tiles sit in the frontpage's visually hidden "Snarveier" h2 section. */}
      <h3 className="ds-heading app-solid__title" data-size="sm">
        {tile.title}
        <span className="app-arrow-chip" data-color="neutral" aria-hidden="true">
          <ArrowRightIcon />
        </span>
      </h3>
    </Link>
  );
}
