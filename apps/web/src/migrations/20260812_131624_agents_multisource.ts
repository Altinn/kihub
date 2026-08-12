import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_artifacts_type" ADD VALUE 'agent';
  CREATE TABLE "discovery_runs_card_issues" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  ALTER TABLE "artifacts" ADD COLUMN "discovery_source_id" integer;
  ALTER TABLE "artifacts" ADD COLUMN "agent_card" jsonb;
  ALTER TABLE "discovery_runs" ADD COLUMN "summary_adopted" numeric;
  ALTER TABLE "discovery_runs" ADD COLUMN "summary_reassigned" numeric;
  ALTER TABLE "discovery_runs" ADD COLUMN "summary_card_issues" numeric;
  ALTER TABLE "discovery_runs_card_issues" ADD CONSTRAINT "discovery_runs_card_issues_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."discovery_runs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "discovery_runs_card_issues_order_idx" ON "discovery_runs_card_issues" USING btree ("_order");
  CREATE INDEX "discovery_runs_card_issues_parent_id_idx" ON "discovery_runs_card_issues" USING btree ("_parent_id");
  ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_discovery_source_id_discovery_sources_id_fk" FOREIGN KEY ("discovery_source_id") REFERENCES "public"."discovery_sources"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "artifacts_discovery_source_idx" ON "artifacts" USING btree ("discovery_source_id");`)
}

/**
 * `IF EXISTS` on the constraint/index drops is the same hand edit as the 014 migrations
 * (learning/media): defensive against partially-applied state so a failed `down` can be retried
 * without the named drops aborting the transaction. The enum recreation intentionally lacks
 * 'agent' — it fails (by design) if any row still has type='agent'; deactivate/remove those first.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "discovery_runs_card_issues" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "discovery_runs_card_issues" CASCADE;
  ALTER TABLE "artifacts" DROP CONSTRAINT IF EXISTS "artifacts_discovery_source_id_discovery_sources_id_fk";

  ALTER TABLE "artifacts" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_artifacts_type";
  CREATE TYPE "public"."enum_artifacts_type" AS ENUM('skill', 'prompt', 'workflow', 'mcp', 'template', 'policy', 'playbook');
  ALTER TABLE "artifacts" ALTER COLUMN "type" SET DATA TYPE "public"."enum_artifacts_type" USING "type"::"public"."enum_artifacts_type";
  DROP INDEX IF EXISTS "artifacts_discovery_source_idx";
  ALTER TABLE "artifacts" DROP COLUMN "discovery_source_id";
  ALTER TABLE "artifacts" DROP COLUMN "agent_card";
  ALTER TABLE "discovery_runs" DROP COLUMN "summary_adopted";
  ALTER TABLE "discovery_runs" DROP COLUMN "summary_reassigned";
  ALTER TABLE "discovery_runs" DROP COLUMN "summary_card_issues";`)
}
