import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('reader', 'contributor', 'reviewer', 'approver', 'admin');
  CREATE TYPE "public"."enum_artifacts_type" AS ENUM('skill', 'prompt', 'workflow', 'mcp', 'template', 'policy', 'playbook');
  CREATE TYPE "public"."enum_artifacts_visibility" AS ENUM('internal', 'public', 'restricted');
  CREATE TYPE "public"."enum_artifacts_lifecycle_status" AS ENUM('draft', 'experimental', 'in-review', 'approved', 'recommended', 'deprecated', 'archived');
  CREATE TYPE "public"."enum_catalog_entries_risk_level" AS ENUM('low', 'medium', 'high');
  CREATE TYPE "public"."enum_catalog_entries_review_status" AS ENUM('not-submitted', 'in-review');
  CREATE TYPE "public"."enum_catalog_entries_approval_state" AS ENUM('not-approved', 'approved', 'rejected');
  CREATE TYPE "public"."enum_catalog_entries_lifecycle_state" AS ENUM('draft', 'experimental', 'in-review', 'approved', 'recommended', 'deprecated', 'archived');
  CREATE TYPE "public"."enum_reviews_type" AS ENUM('security', 'privacy-gdpr', 'technical', 'accessibility', 'responsible-ai', 'operational');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending', 'completed');
  CREATE TYPE "public"."enum_reviews_decision" AS ENUM('approved', 'changes-requested', 'rejected');
  CREATE TYPE "public"."enum_reviews_risk_level" AS ENUM('low', 'medium', 'high');
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('metadata-edit', 'lifecycle-transition', 'review-recorded', 'approval-decision', 'role-change');
  CREATE TYPE "public"."enum_discovery_sources_last_run_outcome" AS ENUM('success', 'failure');
  CREATE TYPE "public"."enum_discovery_runs_trigger" AS ENUM('webhook', 'scheduled', 'manual');
  CREATE TYPE "public"."enum_discovery_runs_outcome" AS ENUM('success', 'failure');
  CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_frontpage_tiles_variant" AS ENUM('tinted', 'accent');
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"entra_oid" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"tenant_id" varchar,
  	"role" "enum_users_role" DEFAULT 'reader' NOT NULL,
  	"last_login_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "artifacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" varchar NOT NULL,
  	"type" "enum_artifacts_type" NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"version" varchar NOT NULL,
  	"owner_team" varchar,
  	"owner_contact" varchar,
  	"source_provider" varchar,
  	"source_repository" varchar,
  	"source_path" varchar,
  	"install_command" varchar,
  	"readme" varchar,
  	"visibility" "enum_artifacts_visibility",
  	"lifecycle_status" "enum_artifacts_lifecycle_status",
  	"active" boolean DEFAULT true,
  	"last_indexed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "artifacts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "catalog_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"business_owner" varchar,
  	"technical_owner" varchar,
  	"risk_level" "enum_catalog_entries_risk_level",
  	"review_status" "enum_catalog_entries_review_status" DEFAULT 'not-submitted',
  	"approval_state" "enum_catalog_entries_approval_state" DEFAULT 'not-approved',
  	"lifecycle_state" "enum_catalog_entries_lifecycle_state" DEFAULT 'draft' NOT NULL,
  	"recommended" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"internal_notes" varchar,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"type" "enum_reviews_type" NOT NULL,
  	"reviewer_id" integer,
  	"status" "enum_reviews_status" DEFAULT 'pending',
  	"decision" "enum_reviews_decision",
  	"comments" varchar,
  	"required_changes" varchar,
  	"risk_level" "enum_reviews_risk_level",
  	"review_date" timestamp(3) with time zone,
  	"expiry_date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer NOT NULL,
  	"action" "enum_audit_log_action" NOT NULL,
  	"artifact_id" integer,
  	"target_user_id" integer,
  	"details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "discovery_sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"repo" varchar NOT NULL,
  	"ref" varchar DEFAULT 'main',
  	"token_env_var" varchar NOT NULL,
  	"webhook_secret" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"running_since" timestamp(3) with time zone,
  	"last_run_at" timestamp(3) with time zone,
  	"last_run_outcome" "enum_discovery_sources_last_run_outcome",
  	"last_run_summary_created" numeric,
  	"last_run_summary_updated" numeric,
  	"last_run_summary_deactivated" numeric,
  	"last_run_summary_skipped_invalid" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "discovery_runs_skipped_invalid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  CREATE TABLE "discovery_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer NOT NULL,
  	"trigger" "enum_discovery_runs_trigger" NOT NULL,
  	"triggered_by_id" integer,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone,
  	"outcome" "enum_discovery_runs_outcome" NOT NULL,
  	"failure_reason" varchar,
  	"summary_created" numeric,
  	"summary_updated" numeric,
  	"summary_deactivated" numeric,
  	"summary_duplicates" numeric,
  	"summary_skipped_invalid" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "discovery_runs_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"summary" varchar,
  	"body" jsonb NOT NULL,
  	"author_id" integer,
  	"status" "enum_news_status" DEFAULT 'draft' NOT NULL,
  	"publish_date" timestamp(3) with time zone,
  	"hero_image_url" varchar,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "news_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"description" jsonb NOT NULL,
  	"start_date_time" timestamp(3) with time zone NOT NULL,
  	"end_date_time" timestamp(3) with time zone,
  	"location" varchar,
  	"online_url" varchar,
  	"organizer" varchar,
  	"status" "enum_events_status" DEFAULT 'draft' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"artifacts_id" integer,
  	"catalog_entries_id" integer,
  	"reviews_id" integer,
  	"audit_log_id" integer,
  	"discovery_sources_id" integer,
  	"discovery_runs_id" integer,
  	"news_id" integer,
  	"events_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_chrome_nav" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_chrome_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_chrome" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"footer_contact_label" varchar DEFAULT 'Kontakt oss:',
  	"footer_contact_email" varchar DEFAULT 'kitt@digdir.no',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "frontpage_tiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"title" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"variant" "enum_frontpage_tiles_variant" DEFAULT 'tinted'
  );
  
  CREATE TABLE "frontpage_subscriptions_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "frontpage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_eyebrow" varchar DEFAULT 'Digdir / BOD / KITT-teamet',
  	"hero_heading" varchar DEFAULT 'Kunstig intelligens i BOD',
  	"hero_accent_word" varchar DEFAULT 'BOD',
  	"hero_lead" varchar DEFAULT 'Vi hjelper deg og ditt team i gang med verktøy og veiledning for en trygg og innovativ bruk av KI i offentlig sektor.',
  	"hero_primary_cta_label" varchar DEFAULT 'Se verktøy',
  	"hero_primary_cta_href" varchar DEFAULT '/registry',
  	"hero_secondary_cta_label" varchar DEFAULT 'Hva skjer i BOD',
  	"hero_secondary_cta_href" varchar DEFAULT '/events',
  	"subscriptions_eyebrow" varchar DEFAULT 'Tilgjengelige abonnementer',
  	"subscriptions_heading" varchar DEFAULT 'Støttede KI-abonnementer i Digdir',
  	"subscriptions_description" varchar DEFAULT 'Disse abonnementene er godkjent og tilgjengelig for BOD-ansatte. Ta kontakt med KITT for tilgang.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "artifacts_texts" ADD CONSTRAINT "artifacts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_entries" ADD CONSTRAINT "catalog_entries_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalog_entries" ADD CONSTRAINT "catalog_entries_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discovery_runs_skipped_invalid" ADD CONSTRAINT "discovery_runs_skipped_invalid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."discovery_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_source_id_discovery_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."discovery_sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_triggered_by_id_users_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discovery_runs_texts" ADD CONSTRAINT "discovery_runs_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discovery_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_texts" ADD CONSTRAINT "news_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_texts" ADD CONSTRAINT "events_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalog_entries_fk" FOREIGN KEY ("catalog_entries_id") REFERENCES "public"."catalog_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discovery_sources_fk" FOREIGN KEY ("discovery_sources_id") REFERENCES "public"."discovery_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discovery_runs_fk" FOREIGN KEY ("discovery_runs_id") REFERENCES "public"."discovery_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_chrome_nav" ADD CONSTRAINT "site_chrome_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_chrome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_chrome_footer_links" ADD CONSTRAINT "site_chrome_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_chrome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "frontpage_tiles" ADD CONSTRAINT "frontpage_tiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."frontpage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "frontpage_subscriptions_chips" ADD CONSTRAINT "frontpage_subscriptions_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."frontpage"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "users_entra_oid_idx" ON "users" USING btree ("entra_oid");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "artifacts_artifact_id_idx" ON "artifacts" USING btree ("artifact_id");
  CREATE INDEX "artifacts_active_idx" ON "artifacts" USING btree ("active");
  CREATE INDEX "artifacts_updated_at_idx" ON "artifacts" USING btree ("updated_at");
  CREATE INDEX "artifacts_created_at_idx" ON "artifacts" USING btree ("created_at");
  CREATE INDEX "artifacts_texts_order_parent" ON "artifacts_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "catalog_entries_artifact_idx" ON "catalog_entries" USING btree ("artifact_id");
  CREATE INDEX "catalog_entries_updated_by_idx" ON "catalog_entries" USING btree ("updated_by_id");
  CREATE INDEX "catalog_entries_updated_at_idx" ON "catalog_entries" USING btree ("updated_at");
  CREATE INDEX "catalog_entries_created_at_idx" ON "catalog_entries" USING btree ("created_at");
  CREATE INDEX "reviews_artifact_idx" ON "reviews" USING btree ("artifact_id");
  CREATE INDEX "reviews_reviewer_idx" ON "reviews" USING btree ("reviewer_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_artifact_idx" ON "audit_log" USING btree ("artifact_id");
  CREATE INDEX "audit_log_target_user_idx" ON "audit_log" USING btree ("target_user_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE UNIQUE INDEX "discovery_sources_name_idx" ON "discovery_sources" USING btree ("name");
  CREATE INDEX "discovery_sources_enabled_idx" ON "discovery_sources" USING btree ("enabled");
  CREATE INDEX "discovery_sources_updated_at_idx" ON "discovery_sources" USING btree ("updated_at");
  CREATE INDEX "discovery_sources_created_at_idx" ON "discovery_sources" USING btree ("created_at");
  CREATE INDEX "discovery_runs_skipped_invalid_order_idx" ON "discovery_runs_skipped_invalid" USING btree ("_order");
  CREATE INDEX "discovery_runs_skipped_invalid_parent_id_idx" ON "discovery_runs_skipped_invalid" USING btree ("_parent_id");
  CREATE INDEX "discovery_runs_source_idx" ON "discovery_runs" USING btree ("source_id");
  CREATE INDEX "discovery_runs_triggered_by_idx" ON "discovery_runs" USING btree ("triggered_by_id");
  CREATE INDEX "discovery_runs_updated_at_idx" ON "discovery_runs" USING btree ("updated_at");
  CREATE INDEX "discovery_runs_created_at_idx" ON "discovery_runs" USING btree ("created_at");
  CREATE INDEX "discovery_runs_texts_order_parent" ON "discovery_runs_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_author_idx" ON "news" USING btree ("author_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news_texts_order_parent" ON "news_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_texts_order_parent" ON "events_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_artifacts_id_idx" ON "payload_locked_documents_rels" USING btree ("artifacts_id");
  CREATE INDEX "payload_locked_documents_rels_catalog_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("catalog_entries_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_locked_documents_rels_discovery_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("discovery_sources_id");
  CREATE INDEX "payload_locked_documents_rels_discovery_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("discovery_runs_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_chrome_nav_order_idx" ON "site_chrome_nav" USING btree ("_order");
  CREATE INDEX "site_chrome_nav_parent_id_idx" ON "site_chrome_nav" USING btree ("_parent_id");
  CREATE INDEX "site_chrome_footer_links_order_idx" ON "site_chrome_footer_links" USING btree ("_order");
  CREATE INDEX "site_chrome_footer_links_parent_id_idx" ON "site_chrome_footer_links" USING btree ("_parent_id");
  CREATE INDEX "frontpage_tiles_order_idx" ON "frontpage_tiles" USING btree ("_order");
  CREATE INDEX "frontpage_tiles_parent_id_idx" ON "frontpage_tiles" USING btree ("_parent_id");
  CREATE INDEX "frontpage_subscriptions_chips_order_idx" ON "frontpage_subscriptions_chips" USING btree ("_order");
  CREATE INDEX "frontpage_subscriptions_chips_parent_id_idx" ON "frontpage_subscriptions_chips" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users" CASCADE;
  DROP TABLE "artifacts" CASCADE;
  DROP TABLE "artifacts_texts" CASCADE;
  DROP TABLE "catalog_entries" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "discovery_sources" CASCADE;
  DROP TABLE "discovery_runs_skipped_invalid" CASCADE;
  DROP TABLE "discovery_runs" CASCADE;
  DROP TABLE "discovery_runs_texts" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_texts" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_texts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_chrome_nav" CASCADE;
  DROP TABLE "site_chrome_footer_links" CASCADE;
  DROP TABLE "site_chrome" CASCADE;
  DROP TABLE "frontpage_tiles" CASCADE;
  DROP TABLE "frontpage_subscriptions_chips" CASCADE;
  DROP TABLE "frontpage" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_artifacts_type";
  DROP TYPE "public"."enum_artifacts_visibility";
  DROP TYPE "public"."enum_artifacts_lifecycle_status";
  DROP TYPE "public"."enum_catalog_entries_risk_level";
  DROP TYPE "public"."enum_catalog_entries_review_status";
  DROP TYPE "public"."enum_catalog_entries_approval_state";
  DROP TYPE "public"."enum_catalog_entries_lifecycle_state";
  DROP TYPE "public"."enum_reviews_type";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_reviews_decision";
  DROP TYPE "public"."enum_reviews_risk_level";
  DROP TYPE "public"."enum_audit_log_action";
  DROP TYPE "public"."enum_discovery_sources_last_run_outcome";
  DROP TYPE "public"."enum_discovery_runs_trigger";
  DROP TYPE "public"."enum_discovery_runs_outcome";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum_frontpage_tiles_variant";`)
}
