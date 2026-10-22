CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'needs_info', 'approved', 'rejected', 'issued');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "applications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tracking_no" text NOT NULL,
	"citizen_id" integer NOT NULL,
	"ward_id" integer NOT NULL,
	"service_type_id" integer NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"tole" text NOT NULL,
	"house_no" text,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "applications_tracking_no_unique" UNIQUE("tracking_no"),
	CONSTRAINT "applications_version_positive" CHECK ("applications"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "service_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"local_level_code" text NOT NULL,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ne" text NOT NULL,
	"fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"required_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"form_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "service_types_local_level_code_code_unique" UNIQUE("local_level_code","code"),
	CONSTRAINT "service_types_fee_non_negative" CHECK ("service_types"."fee" >= 0)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_citizen_id_users_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_local_level_code_local_levels_code_fk" FOREIGN KEY ("local_level_code") REFERENCES "public"."local_levels"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_citizen_created_index" ON "applications" USING btree ("citizen_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "applications_ward_status_created_index" ON "applications" USING btree ("ward_id","status","created_at" DESC NULLS LAST);