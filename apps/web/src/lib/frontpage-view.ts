import type { Color } from '@digdir/designsystemet-types';
import type { Tile } from '@/lib/site-content-defaults';

/**
 * 026 — how a frontpage tile's stored `variant` renders. The enum values are unchanged (saved
 * editor content keeps working, no migration). Each tile is a solid card in a Digdir colour:
 * Designsystemet's `base-default` surface with its generated `base-contrast-default` text (review
 * revision, keeping 025's colour intensity). `tinted` keeps 025's Rød and `accent` its Gul.
 */
export interface TileAppearance {
  /** Designsystemet `data-color` whose solid base surface the card uses: brand1 Rød, brand2 Gul. */
  color: Color;
}

export function tileAppearance(variant: Tile['variant']): TileAppearance {
  return { color: variant === 'accent' ? 'brand2' : 'brand1' };
}
