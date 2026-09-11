import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
  CREATE TABLE "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"summary" varchar,
  	"body" jsonb NOT NULL,
  	"status" "enum_projects_status" DEFAULT 'draft' NOT NULL,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "projects_id" integer;
  CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // DROP TABLE ... CASCADE already removes the FK constraint on payload_locked_documents_rels (it
  // depends on the dropped table), so the generated unconditional DROP CONSTRAINT/INDEX below it
  // would fail — hand-patched with IF EXISTS, same fix as 20260810_090312_learning_pages.
  await db.execute(sql`
   ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_projects_fk";

  DROP INDEX IF EXISTS "payload_locked_documents_rels_projects_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "projects_id";
  DROP TYPE "public"."enum_projects_status";`)
}
