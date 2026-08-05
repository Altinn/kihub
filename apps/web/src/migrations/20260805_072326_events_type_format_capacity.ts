import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_event_type" AS ENUM('webinar', 'verksted', 'kurs', 'konferanse', 'internt');
  CREATE TYPE "public"."enum_events_format" AS ENUM('digitalt', 'oppmote', 'hybrid');
  ALTER TABLE "events" ADD COLUMN "event_type" "enum_events_event_type" DEFAULT 'internt' NOT NULL;
  ALTER TABLE "events" ADD COLUMN "format" "enum_events_format" DEFAULT 'digitalt' NOT NULL;
  ALTER TABLE "events" ADD COLUMN "channel" varchar;
  ALTER TABLE "events" ADD COLUMN "capacity" numeric;
  ALTER TABLE "events" ADD COLUMN "seats_taken" numeric;
  -- 012 FR-010 backfill: infer the form of participation for pre-012 events from the data they
  -- already carry (event_type backfills itself via the column default 'internt'; capacity stays
  -- NULL = "Åpen for alle").
  UPDATE "events" SET "format" =
    CASE WHEN "location" IS NOT NULL AND "online_url" IS NOT NULL THEN 'hybrid'::"enum_events_format"
         WHEN "location" IS NOT NULL THEN 'oppmote'::"enum_events_format"
         ELSE 'digitalt'::"enum_events_format" END;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP COLUMN "event_type";
  ALTER TABLE "events" DROP COLUMN "format";
  ALTER TABLE "events" DROP COLUMN "channel";
  ALTER TABLE "events" DROP COLUMN "capacity";
  ALTER TABLE "events" DROP COLUMN "seats_taken";
  DROP TYPE "public"."enum_events_event_type";
  DROP TYPE "public"."enum_events_format";`)
}
