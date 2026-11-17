import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "parent_id" integer;
  ALTER TABLE "pages" ADD COLUMN "order" numeric DEFAULT 100;
  ALTER TABLE "_pages_v" ADD COLUMN "version_parent_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_order" numeric DEFAULT 100;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_parent_id_pages_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_parent_idx" ON "pages" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_parent_idx" ON "_pages_v" USING btree ("version_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DROP CONSTRAINT "pages_parent_id_pages_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_parent_id_pages_id_fk";
  
  DROP INDEX "pages_parent_idx";
  DROP INDEX "_pages_v_version_version_parent_idx";
  ALTER TABLE "pages" DROP COLUMN "parent_id";
  ALTER TABLE "pages" DROP COLUMN "order";
  ALTER TABLE "_pages_v" DROP COLUMN "version_parent_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_order";`)
}
