import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// 020 — news hero images (specs/020-news-hero-media/data-model.md). Additive only: the managed
// `news.hero_image_id` (FK → media, ON DELETE SET NULL) plus the 16:10 `card`/`card2x` media sizes.
// `news.hero_image_url` is deliberately untouched (FR-009). `media.focal_x`/`focal_y` already exist
// from 20260810_093128_media_uploads — Payload creates them even while `focalPoint` is disabled.
// `down` is hand-patched with IF EXISTS (the 014/015/016 precedent).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news" ADD COLUMN "hero_image_id" integer;
  ALTER TABLE "media" ADD COLUMN "sizes_card_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card2x_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card2x_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card2x_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card2x_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card2x_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card2x_filename" varchar;
  ALTER TABLE "news" ADD CONSTRAINT "news_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "news_hero_image_idx" ON "news" USING btree ("hero_image_id");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_card2x_sizes_card2x_filename_idx" ON "media" USING btree ("sizes_card2x_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news" DROP CONSTRAINT IF EXISTS "news_hero_image_id_media_id_fk";
  
  DROP INDEX IF EXISTS "news_hero_image_idx";
  DROP INDEX IF EXISTS "media_sizes_card_sizes_card_filename_idx";
  DROP INDEX IF EXISTS "media_sizes_card2x_sizes_card2x_filename_idx";
  ALTER TABLE "news" DROP COLUMN IF EXISTS "hero_image_id";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_url";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_width";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_height";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_mime_type";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_filesize";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_filename";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card2x_url";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card2x_width";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card2x_height";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card2x_mime_type";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card2x_filesize";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card2x_filename";`)
}
