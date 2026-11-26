import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'user-delete';`)
}

// `down` recreates the enum WITHOUT 'user-delete', so it fails by design while any audit row
// records a user deletion (the 015 'agent' precedent): delete or archive those rows first.
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('metadata-edit', 'lifecycle-transition', 'review-recorded', 'approval-decision', 'role-change');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";`)
}
