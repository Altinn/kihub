import { APIError, type CollectionBeforeValidateHook } from 'payload';
import { MAX_PAGE_DEPTH } from './page-tree';

/**
 * 028 US2 — hierarchy rules for Sider (specs/028-docs-navigation/contracts/page-hierarchy.md §B,
 * research R9). A `beforeValidate` hook rather than field validation, so the rules hold on the API
 * path too (the LearningPage subcategory precedent): `filterOptions` only shapes the admin dropdown.
 *
 * Ancestors and descendants are read from the main table (any status). It runs on every save,
 * including autosave and publish, so a cycle two concurrent drafts could build is refused by the save
 * that would close it. Cost: nothing without a parent, otherwise at most about five indexed reads.
 */

export const PAGE_HIERARCHY_MESSAGES = {
  self: 'En side kan ikke være overordnet side for seg selv.',
  cycle: 'Siden kan ikke ligge under en av sine egne undersider.',
  depth: 'Siden kan ikke ligge her: sider kan bare ha tre nivåer.',
  missing: 'Den overordnede siden finnes ikke lenger.',
} as const;

type Ref = number | string | { id: number | string } | null | undefined;

function idOf(ref: Ref): number | null {
  if (ref == null || ref === '') return null;
  const raw = typeof ref === 'object' ? ref.id : ref;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export const validatePageParent: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  // A partial update without `parent` keeps the stored one; clearing it is always allowed.
  const parentId = idOf(data.parent !== undefined ? (data.parent as Ref) : (originalDoc?.parent as Ref));
  if (parentId == null) return data;
  const id = idOf((originalDoc?.id ?? data.id) as Ref);

  if (id != null && parentId === id) throw new APIError(PAGE_HIERARCHY_MESSAGES.self, 400);

  // Walk up from the parent. `level` ends as the parent's level (1 = top-level page).
  let level = 0;
  let cursor: number | null = parentId;
  while (cursor != null) {
    if (id != null && cursor === id) throw new APIError(PAGE_HIERARCHY_MESSAGES.cycle, 400);
    // Deeper than any valid chain (or a cycle elsewhere in bad data): the parent cannot take a child.
    if (level >= MAX_PAGE_DEPTH) throw new APIError(PAGE_HIERARCHY_MESSAGES.depth, 400);
    let doc: { parent?: unknown } | null = null;
    try {
      doc = await req.payload.findByID({
        collection: 'pages',
        id: cursor,
        depth: 0,
        overrideAccess: true,
        req,
      });
    } catch {
      doc = null;
    }
    if (!doc) {
      if (level === 0) throw new APIError(PAGE_HIERARCHY_MESSAGES.missing, 400);
      break; // an ancestor removed mid-walk: the chain simply ends there
    }
    level += 1;
    cursor = idOf(doc.parent as Ref);
  }
  if (level >= MAX_PAGE_DEPTH) throw new APIError(PAGE_HIERARCHY_MESSAGES.depth, 400);

  // The page brings its own subtree along: level(parent) + 1 + height(subtree) must stay ≤ 3.
  let height = 0;
  if (id != null) {
    let frontier: number[] = [id];
    while (frontier.length && height < MAX_PAGE_DEPTH - 1) {
      const children = await req.payload.find({
        collection: 'pages',
        where: { parent: { in: frontier } },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: {},
        req,
      });
      frontier = children.docs.map((doc) => Number(doc.id));
      if (frontier.length) height += 1;
    }
  }
  if (level + 1 + height > MAX_PAGE_DEPTH) throw new APIError(PAGE_HIERARCHY_MESSAGES.depth, 400);

  return data;
};
