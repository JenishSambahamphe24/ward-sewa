CREATE TYPE "public"."user_role" AS ENUM('citizen', 'ward_secretary', 'ward_chair', 'municipality_admin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"phone" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'citizen' NOT NULL,
	"ward_id" integer,
	"local_level_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_phone_format" CHECK ("users"."phone" ~ '^9[678][0-9]{8}$'),
	CONSTRAINT "users_role_scope" CHECK (("users"."role" = 'citizen' AND "users"."ward_id" IS NULL AND "users"."local_level_code" IS NULL)
        OR ("users"."role" IN ('ward_secretary', 'ward_chair') AND "users"."ward_id" IS NOT NULL AND "users"."local_level_code" IS NULL)
        OR ("users"."role" = 'municipality_admin' AND "users"."local_level_code" IS NOT NULL AND "users"."ward_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_local_level_code_local_levels_code_fk" FOREIGN KEY ("local_level_code") REFERENCES "public"."local_levels"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_one_active_chair_per_ward" ON "users" USING btree ("ward_id") WHERE "users"."role" = 'ward_chair' AND "users"."is_active";--> statement-breakpoint
CREATE INDEX "users_ward_id_index" ON "users" USING btree ("ward_id");