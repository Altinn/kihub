import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Altinn/kihub#149 — the footer's single `contactEmail` becomes a `contacts` array of
// {name, email}. The old column is dropped, not carried over: its value can't become a contact
// row (no name to pair it with), and the seeded address it held (kitt@digdir.no) doesn't exist,
// which is what the issue reports. Editors enter the team's contacts in /cms → Site chrome.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_chrome_footer_contacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL
  );
  
  ALTER TABLE "site_chrome" ALTER COLUMN "footer_contact_label" SET DEFAULT 'Kontakt Team KITT:';
  ALTER TABLE "site_chrome_footer_contacts" ADD CONSTRAINT "site_chrome_footer_contacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_chrome"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_chrome_footer_contacts_order_idx" ON "site_chrome_footer_contacts" USING btree ("_order");
  CREATE INDEX "site_chrome_footer_contacts_parent_id_idx" ON "site_chrome_footer_contacts" USING btree ("_parent_id");
  ALTER TABLE "site_chrome" DROP COLUMN "footer_contact_email";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_chrome_footer_contacts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_chrome_footer_contacts" CASCADE;
  ALTER TABLE "site_chrome" ALTER COLUMN "footer_contact_label" SET DEFAULT 'Kontakt oss:';
  ALTER TABLE "site_chrome" ADD COLUMN "footer_contact_email" varchar DEFAULT 'kitt@digdir.no';`)
}
