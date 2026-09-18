import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "frontpage_subscriptions_chips" ADD COLUMN "description" varchar;
  ALTER TABLE "frontpage" ADD COLUMN "subscriptions_request_access_label" varchar DEFAULT 'Hvordan bestille tilgang?';
  ALTER TABLE "frontpage" ADD COLUMN "subscriptions_request_access_body" varchar DEFAULT 'Ta kontakt med KITT-teamet på kitt@digdir.no for å be om tilgang. Oppgi hvilket abonnement du ønsker og hvilken avdeling du tilhører, så hjelper vi deg videre.';
  ALTER TABLE "frontpage_subscriptions_chips" DROP COLUMN "href";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "frontpage_subscriptions_chips" ADD COLUMN "href" varchar;
  ALTER TABLE "frontpage_subscriptions_chips" DROP COLUMN "description";
  ALTER TABLE "frontpage" DROP COLUMN "subscriptions_request_access_label";
  ALTER TABLE "frontpage" DROP COLUMN "subscriptions_request_access_body";`)
}
