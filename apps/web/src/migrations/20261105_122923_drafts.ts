import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * 027 — Payload versions + drafts for news, projects, events and learning pages (research R2).
 *
 * Generated with `migrate:create` in MEDIA_STORAGE_MODE=azure (so the storage plugin's
 * `media._objectkey` stays in the snapshot), answering "rename" for `status` → `_status`: the old
 * column already uses the very enum type Payload names for `_status` (`enum_<table>_status`), so a
 * rename keeps every row's visibility exactly (FR-004/SC-003) with no copy step.
 *
 * Hand-written addition (second statement of `up`): ONE `latest` version row per existing document.
 * Draft reads (`find({ draft: true })` — the preview, the admin's Versions tab) go to the version
 * tables, so without this backfill documents created before 027 would be invisible to preview.
 * Hand-patched `down`: `IF EXISTS` on every drop (the 014/015/016 generator posture). `down` restores
 * NOT NULL on title/body/…, so it fails by design while a partially filled draft exists.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_event_type" AS ENUM('webinar', 'verksted', 'kurs', 'konferanse', 'internt');
  CREATE TYPE "public"."enum__events_v_version_format" AS ENUM('digitalt', 'oppmote', 'hybrid');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__learning_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_author_id" integer,
  	"version_publish_date" timestamp(3) with time zone,
  	"version_hero_image_id" integer,
  	"version_hero_image_url" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_news_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" jsonb,
  	"version_start_date_time" timestamp(3) with time zone,
  	"version_end_date_time" timestamp(3) with time zone,
  	"version_location" varchar,
  	"version_online_url" varchar,
  	"version_organizer" varchar,
  	"version_event_type" "enum__events_v_version_event_type" DEFAULT 'internt',
  	"version_format" "enum__events_v_version_format" DEFAULT 'digitalt',
  	"version_channel" varchar,
  	"version_capacity" numeric,
  	"version_seats_taken" numeric,
  	"version_featured" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_events_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_learning_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_subcategory_id" integer,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_order" numeric DEFAULT 100,
  	"version_author_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__learning_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "news" RENAME COLUMN "status" TO "_status";
  ALTER TABLE "projects" RENAME COLUMN "status" TO "_status";
  ALTER TABLE "events" RENAME COLUMN "status" TO "_status";
  ALTER TABLE "learning_pages" RENAME COLUMN "status" TO "_status";
  ALTER TABLE "news" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "news" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "start_date_time" DROP NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "event_type" DROP NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "format" DROP NOT NULL;
  ALTER TABLE "learning_pages" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "learning_pages" ALTER COLUMN "category_id" DROP NOT NULL;
  ALTER TABLE "learning_pages" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_texts" ADD CONSTRAINT "_news_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_texts" ADD CONSTRAINT "_events_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_learning_pages_v" ADD CONSTRAINT "_learning_pages_v_parent_id_learning_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."learning_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_learning_pages_v" ADD CONSTRAINT "_learning_pages_v_version_category_id_learning_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."learning_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_learning_pages_v" ADD CONSTRAINT "_learning_pages_v_version_subcategory_id_learning_subcategories_id_fk" FOREIGN KEY ("version_subcategory_id") REFERENCES "public"."learning_subcategories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_learning_pages_v" ADD CONSTRAINT "_learning_pages_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_author_idx" ON "_news_v" USING btree ("version_author_id");
  CREATE INDEX "_news_v_version_version_hero_image_idx" ON "_news_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_autosave_idx" ON "_news_v" USING btree ("autosave");
  CREATE INDEX "_news_v_texts_order_parent" ON "_news_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_projects_v_version_version__status_idx" ON "_projects_v" USING btree ("version__status");
  CREATE INDEX "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX "_projects_v_latest_idx" ON "_projects_v" USING btree ("latest");
  CREATE INDEX "_projects_v_autosave_idx" ON "_projects_v" USING btree ("autosave");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_autosave_idx" ON "_events_v" USING btree ("autosave");
  CREATE INDEX "_events_v_texts_order_parent" ON "_events_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_learning_pages_v_parent_idx" ON "_learning_pages_v" USING btree ("parent_id");
  CREATE INDEX "_learning_pages_v_version_version_slug_idx" ON "_learning_pages_v" USING btree ("version_slug");
  CREATE INDEX "_learning_pages_v_version_version_category_idx" ON "_learning_pages_v" USING btree ("version_category_id");
  CREATE INDEX "_learning_pages_v_version_version_subcategory_idx" ON "_learning_pages_v" USING btree ("version_subcategory_id");
  CREATE INDEX "_learning_pages_v_version_version_author_idx" ON "_learning_pages_v" USING btree ("version_author_id");
  CREATE INDEX "_learning_pages_v_version_version_updated_at_idx" ON "_learning_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_learning_pages_v_version_version_created_at_idx" ON "_learning_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_learning_pages_v_version_version__status_idx" ON "_learning_pages_v" USING btree ("version__status");
  CREATE INDEX "_learning_pages_v_created_at_idx" ON "_learning_pages_v" USING btree ("created_at");
  CREATE INDEX "_learning_pages_v_updated_at_idx" ON "_learning_pages_v" USING btree ("updated_at");
  CREATE INDEX "_learning_pages_v_latest_idx" ON "_learning_pages_v" USING btree ("latest");
  CREATE INDEX "_learning_pages_v_autosave_idx" ON "_learning_pages_v" USING btree ("autosave");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "projects__status_idx" ON "projects" USING btree ("_status");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "learning_pages__status_idx" ON "learning_pages" USING btree ("_status");`)

  // 027 backfill — one latest version per existing document (+ its hasMany text rows).
  await db.execute(sql`
   INSERT INTO "_news_v" ("parent_id", "version_title", "version_slug", "version_summary", "version_body",
     "version_author_id", "version_publish_date", "version_hero_image_id", "version_hero_image_url",
     "version_featured", "version_updated_at", "version_created_at", "version__status",
     "created_at", "updated_at", "latest", "autosave")
   SELECT "id", "title", "slug", "summary", "body", "author_id", "publish_date", "hero_image_id",
     "hero_image_url", "featured", "updated_at", "created_at",
     "_status"::text::"enum__news_v_version_status", "updated_at", "updated_at", true, false
   FROM "news";

  INSERT INTO "_news_v_texts" ("order", "parent_id", "path", "text")
   SELECT t."order", v."id", t."path", t."text"
   FROM "news_texts" t JOIN "_news_v" v ON v."parent_id" = t."parent_id";

  INSERT INTO "_projects_v" ("parent_id", "version_title", "version_slug", "version_summary", "version_body",
     "version_order", "version_updated_at", "version_created_at", "version__status",
     "created_at", "updated_at", "latest", "autosave")
   SELECT "id", "title", "slug", "summary", "body", "order", "updated_at", "created_at",
     "_status"::text::"enum__projects_v_version_status", "updated_at", "updated_at", true, false
   FROM "projects";

  INSERT INTO "_events_v" ("parent_id", "version_title", "version_slug", "version_description",
     "version_start_date_time", "version_end_date_time", "version_location", "version_online_url",
     "version_organizer", "version_event_type", "version_format", "version_channel", "version_capacity",
     "version_seats_taken", "version_featured", "version_updated_at", "version_created_at",
     "version__status", "created_at", "updated_at", "latest", "autosave")
   SELECT "id", "title", "slug", "description", "start_date_time", "end_date_time", "location",
     "online_url", "organizer", "event_type"::text::"enum__events_v_version_event_type",
     "format"::text::"enum__events_v_version_format", "channel", "capacity", "seats_taken", "featured",
     "updated_at", "created_at", "_status"::text::"enum__events_v_version_status",
     "updated_at", "updated_at", true, false
   FROM "events";

  INSERT INTO "_events_v_texts" ("order", "parent_id", "path", "text")
   SELECT t."order", v."id", t."path", t."text"
   FROM "events_texts" t JOIN "_events_v" v ON v."parent_id" = t."parent_id";

  INSERT INTO "_learning_pages_v" ("parent_id", "version_title", "version_slug", "version_category_id",
     "version_subcategory_id", "version_summary", "version_body", "version_order", "version_author_id",
     "version_updated_at", "version_created_at", "version__status",
     "created_at", "updated_at", "latest", "autosave")
   SELECT "id", "title", "slug", "category_id", "subcategory_id", "summary", "body", "order", "author_id",
     "updated_at", "created_at", "_status"::text::"enum__learning_pages_v_version_status",
     "updated_at", "updated_at", true, false
   FROM "learning_pages";`)
}


export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_news_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_projects_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_learning_pages_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "_news_v" CASCADE;
  DROP TABLE IF EXISTS "_news_v_texts" CASCADE;
  DROP TABLE IF EXISTS "_projects_v" CASCADE;
  DROP TABLE IF EXISTS "_events_v" CASCADE;
  DROP TABLE IF EXISTS "_events_v_texts" CASCADE;
  DROP TABLE IF EXISTS "_learning_pages_v" CASCADE;
  ALTER TABLE "news" RENAME COLUMN "_status" TO "status";
  ALTER TABLE "projects" RENAME COLUMN "_status" TO "status";
  ALTER TABLE "events" RENAME COLUMN "_status" TO "status";
  ALTER TABLE "learning_pages" RENAME COLUMN "_status" TO "status";
  DROP INDEX IF EXISTS "news__status_idx";
  DROP INDEX IF EXISTS "projects__status_idx";
  DROP INDEX IF EXISTS "events__status_idx";
  DROP INDEX IF EXISTS "learning_pages__status_idx";
  ALTER TABLE "news" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "news" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "start_date_time" SET NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "event_type" SET NOT NULL;
  ALTER TABLE "events" ALTER COLUMN "format" SET NOT NULL;
  ALTER TABLE "learning_pages" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "learning_pages" ALTER COLUMN "category_id" SET NOT NULL;
  ALTER TABLE "learning_pages" ALTER COLUMN "body" SET NOT NULL;
  DROP TYPE IF EXISTS "public"."enum__news_v_version_status";
  DROP TYPE IF EXISTS "public"."enum__projects_v_version_status";
  DROP TYPE IF EXISTS "public"."enum__events_v_version_event_type";
  DROP TYPE IF EXISTS "public"."enum__events_v_version_format";
  DROP TYPE IF EXISTS "public"."enum__events_v_version_status";
  DROP TYPE IF EXISTS "public"."enum__learning_pages_v_version_status";`)
}
