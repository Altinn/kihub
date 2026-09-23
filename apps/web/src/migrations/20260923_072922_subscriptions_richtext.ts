import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Altinn/kihub#148 — `chips[].description` and `subscriptions.requestAccess.body` become richText
// so editors can add bold/links/paragraphs instead of typing literal markdown into a plain
// textarea. Hand-patched from the generated migration: a bare `SET DATA TYPE jsonb` fails on any
// existing plain-text row ("column ... cannot be cast automatically to type jsonb" — plain
// sentences aren't valid JSON), so `up` wraps each existing string in a single-paragraph lexical
// document via `USING`, preserving existing content instead of destroying it. `down` reverses that
// by pulling the first paragraph's first text node back out — lossy for any bold/links an editor
// adds after this ships, same as every other down-migration here: a rollback path, not a fidelity
// guarantee.
const TO_LEXICAL = (column: string) => `
    CASE WHEN "${column}" IS NULL THEN NULL ELSE jsonb_build_object(
      'root', jsonb_build_object(
        'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
        'children', jsonb_build_array(jsonb_build_object(
          'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
          'children', jsonb_build_array(jsonb_build_object(
            'type', 'text', 'version', 1, 'detail', 0, 'format', 0, 'mode', 'normal', 'style', '',
            'text', "${column}"
          ))
        ))
      )
    ) END`;
const FROM_LEXICAL = (column: string) =>
  `"${column}" #>> '{root,children,0,children,0,text}'`;

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_request_access_body" DROP DEFAULT;
  ALTER TABLE "frontpage_subscriptions_chips" ALTER COLUMN "description" SET DATA TYPE jsonb USING (${sql.raw(TO_LEXICAL('description'))});
  ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_request_access_body" SET DATA TYPE jsonb USING (${sql.raw(TO_LEXICAL('subscriptions_request_access_body'))});
  ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_request_access_body" SET DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"text","version":1,"detail":0,"format":0,"mode":"normal","style":"","text":"Ta kontakt med KITT-teamet på kitt@digdir.no for å be om tilgang. Oppgi hvilket abonnement du ønsker og hvilken avdeling du tilhører, så hjelper vi deg videre."}]}]}}'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_request_access_body" DROP DEFAULT;
  ALTER TABLE "frontpage_subscriptions_chips" ALTER COLUMN "description" SET DATA TYPE varchar USING (${sql.raw(FROM_LEXICAL('description'))});
  ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_request_access_body" SET DATA TYPE varchar USING (${sql.raw(FROM_LEXICAL('subscriptions_request_access_body'))});
  ALTER TABLE "frontpage" ALTER COLUMN "subscriptions_request_access_body" SET DEFAULT 'Ta kontakt med KITT-teamet på kitt@digdir.no for å be om tilgang. Oppgi hvilket abonnement du ønsker og hvilken avdeling du tilhører, så hjelper vi deg videre.';`)
}
