import type { Payload } from 'payload';

/**
 * Delete every artifact and all rows that reference it, in foreign-key-safe order.
 *
 * `catalog_entries.artifact` and `reviews.artifact` are required (NOT NULL) yet Payload
 * generates their foreign key as `ON DELETE SET NULL` (its default for relationships). A bare
 * `delete from artifacts` therefore makes Postgres try to NULL those columns first, which
 * violates the NOT NULL constraint and aborts the whole transaction — so any leftover governance
 * row (from an interrupted run, seeding, or normal app use) breaks a naive artifact wipe.
 *
 * Production never hard-deletes an artifact (`Artifact.access.delete === false`; discovery
 * deactivates instead), so this only affects the tests' clean-slate wipes. Clearing the children
 * first keeps those wipes robust regardless of what governance rows already exist. `audit_log`
 * is cleared for a full slate too, though its `artifact` column is nullable and would not block
 * the delete on its own.
 */
export async function wipeArtifacts(payload: Payload): Promise<void> {
  await payload.delete({ collection: 'audit-log', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'reviews', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'catalog-entries', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'artifacts', where: { id: { exists: true } }, overrideAccess: true });
}
