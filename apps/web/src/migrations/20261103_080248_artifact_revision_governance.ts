import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artifacts" ADD COLUMN "content_digest" varchar;
  ALTER TABLE "catalog_entries" ADD COLUMN "approval_artifact_version" varchar;
  ALTER TABLE "catalog_entries" ADD COLUMN "approval_artifact_digest" varchar;
  ALTER TABLE "catalog_entries" ADD COLUMN "approval_decided_at" timestamp(3) with time zone;
  ALTER TABLE "reviews" ADD COLUMN "artifact_version" varchar;
  ALTER TABLE "reviews" ADD COLUMN "artifact_digest" varchar;
  ALTER TABLE "discovery_sources" ADD COLUMN "allow_destructive_reconcile" boolean DEFAULT false;
  ALTER TABLE "discovery_runs" ADD COLUMN "config_path" varchar;
  ALTER TABLE "discovery_runs" ADD COLUMN "config_digest" varchar;
  ALTER TABLE "discovery_runs" ADD COLUMN "summary_revision_changed" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artifacts" DROP COLUMN "content_digest";
  ALTER TABLE "catalog_entries" DROP COLUMN "approval_artifact_version";
  ALTER TABLE "catalog_entries" DROP COLUMN "approval_artifact_digest";
  ALTER TABLE "catalog_entries" DROP COLUMN "approval_decided_at";
  ALTER TABLE "reviews" DROP COLUMN "artifact_version";
  ALTER TABLE "reviews" DROP COLUMN "artifact_digest";
  ALTER TABLE "discovery_sources" DROP COLUMN "allow_destructive_reconcile";
  ALTER TABLE "discovery_runs" DROP COLUMN "config_path";
  ALTER TABLE "discovery_runs" DROP COLUMN "config_digest";
  ALTER TABLE "discovery_runs" DROP COLUMN "summary_revision_changed";`)
}
