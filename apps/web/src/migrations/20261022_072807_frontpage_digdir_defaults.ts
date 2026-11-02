import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "frontpage" ALTER COLUMN "hero_eyebrow" SET DEFAULT 'Digdir / KITT-teamet';
  ALTER TABLE "frontpage" ALTER COLUMN "hero_heading" SET DEFAULT 'Kunstig intelligens i Digdir';
  ALTER TABLE "frontpage" ALTER COLUMN "hero_accent_word" SET DEFAULT 'Digdir';
  ALTER TABLE "frontpage" ALTER COLUMN "hero_secondary_cta_label" SET DEFAULT 'Hva skjer i Digdir';
  ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_description" SET DEFAULT 'Disse abonnementene er godkjent og tilgjengelig for Digdir-ansatte. Ta kontakt med KITT for tilgang.';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "frontpage" ALTER COLUMN "hero_eyebrow" SET DEFAULT 'Digdir / BOD / KITT-teamet';
  ALTER TABLE "frontpage" ALTER COLUMN "hero_heading" SET DEFAULT 'Kunstig intelligens i BOD';
  ALTER TABLE "frontpage" ALTER COLUMN "hero_accent_word" SET DEFAULT 'BOD';
  ALTER TABLE "frontpage" ALTER COLUMN "hero_secondary_cta_label" SET DEFAULT 'Hva skjer i BOD';
  ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_description" SET DEFAULT 'Disse abonnementene er godkjent og tilgjengelig for BOD-ansatte. Ta kontakt med KITT for tilgang.';`)
}
