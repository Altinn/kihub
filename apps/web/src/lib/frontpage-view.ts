import type { Color } from '@digdir/designsystemet-types';
import type { Tile } from '@/lib/site-content-defaults';

/**
 * 026 — how a frontpage tile's stored `variant` renders. The enum values are unchanged (saved
 * editor content keeps working, no migration). Like digdir.no's "Hva skal du gjøre?" cards, each
 * tile is a card on a light tint of a Digdir graphic colour — Designsystemet's generated
 * `surface-tinted` role, with dark Blåsvart text at AA contrast. The full-strength graphic colours
 * stay graphics-only. `tinted` keeps 025's Rød and `accent` its Gul, so the two stay distinct.
 */
export interface TileAppearance {
  /** Designsystemet `data-color` whose tinted surface the card uses: brand1 Rød, brand2 Gul. */
  color: Color;
}

export function tileAppearance(variant: Tile['variant']): TileAppearance {
  return { color: variant === 'accent' ? 'brand2' : 'brand1' };
}
