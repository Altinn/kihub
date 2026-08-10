import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_learning_pages_status" AS ENUM('draft', 'published');
  CREATE TABLE "learning_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "learning_subcategories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"category_id" integer NOT NULL,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "learning_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"category_id" integer NOT NULL,
  	"subcategory_id" integer,
  	"summary" varchar,
  	"body" jsonb NOT NULL,
  	"status" "enum_learning_pages_status" DEFAULT 'draft' NOT NULL,
  	"order" numeric DEFAULT 100,
  	"author_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "learning_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "learning_subcategories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "learning_pages_id" integer;
  ALTER TABLE "learning_subcategories" ADD CONSTRAINT "learning_subcategories_category_id_learning_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."learning_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "learning_pages" ADD CONSTRAINT "learning_pages_category_id_learning_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."learning_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "learning_pages" ADD CONSTRAINT "learning_pages_subcategory_id_learning_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."learning_subcategories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "learning_pages" ADD CONSTRAINT "learning_pages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "learning_categories_updated_at_idx" ON "learning_categories" USING btree ("updated_at");
  CREATE INDEX "learning_categories_created_at_idx" ON "learning_categories" USING btree ("created_at");
  CREATE INDEX "learning_subcategories_category_idx" ON "learning_subcategories" USING btree ("category_id");
  CREATE INDEX "learning_subcategories_updated_at_idx" ON "learning_subcategories" USING btree ("updated_at");
  CREATE INDEX "learning_subcategories_created_at_idx" ON "learning_subcategories" USING btree ("created_at");
  CREATE UNIQUE INDEX "learning_pages_slug_idx" ON "learning_pages" USING btree ("slug");
  CREATE INDEX "learning_pages_category_idx" ON "learning_pages" USING btree ("category_id");
  CREATE INDEX "learning_pages_subcategory_idx" ON "learning_pages" USING btree ("subcategory_id");
  CREATE INDEX "learning_pages_author_idx" ON "learning_pages" USING btree ("author_id");
  CREATE INDEX "learning_pages_updated_at_idx" ON "learning_pages" USING btree ("updated_at");
  CREATE INDEX "learning_pages_created_at_idx" ON "learning_pages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_categories_fk" FOREIGN KEY ("learning_categories_id") REFERENCES "public"."learning_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_subcategories_fk" FOREIGN KEY ("learning_subcategories_id") REFERENCES "public"."learning_subcategories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_pages_fk" FOREIGN KEY ("learning_pages_id") REFERENCES "public"."learning_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_learning_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_categories_id");
  CREATE INDEX "payload_locked_documents_rels_learning_subcategories_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_subcategories_id");
  CREATE INDEX "payload_locked_documents_rels_learning_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_pages_id");`)
}

/**
 * 014 — additive: three learning tables + the status enum, plus the reference columns Payload keeps
 * on `payload_locked_documents_rels`. Nothing in `artifacts`, `news`, `events`, `users` or the
 * globals is touched.
 *
 * `IF EXISTS` on the constraint/index drops below is a hand edit to the generated SQL, and it is
 * load-bearing: the `DROP TABLE ... CASCADE` statements above already remove the foreign keys on
 * `payload_locked_documents_rels`, so dropping them again by name aborts the whole transaction.
 * Verified — the generated `down` failed and rolled back before this change.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "learning_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_subcategories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "learning_categories" CASCADE;
  DROP TABLE "learning_subcategories" CASCADE;
  DROP TABLE "learning_pages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_learning_categories_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_learning_subcategories_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_learning_pages_fk";

  DROP INDEX IF EXISTS "payload_locked_documents_rels_learning_categories_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_learning_subcategories_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_learning_pages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "learning_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "learning_subcategories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "learning_pages_id";
  DROP TYPE "public"."enum_learning_pages_status";`)
}
