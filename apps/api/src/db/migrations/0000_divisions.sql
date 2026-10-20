CREATE TYPE "public"."local_level_type" AS ENUM('metropolitan', 'sub_metropolitan', 'municipality', 'rural_municipality');--> statement-breakpoint
CREATE TABLE "districts" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"province_code" text NOT NULL,
	CONSTRAINT "districts_code_format" CHECK ("districts"."code" ~ '^NP[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "local_levels" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "local_level_type" NOT NULL,
	"district_code" text NOT NULL,
	"ward_count" smallint NOT NULL,
	CONSTRAINT "local_levels_code_format" CHECK ("local_levels"."code" ~ '^NP[0-9]{7}$'),
	CONSTRAINT "local_levels_ward_count_positive" CHECK ("local_levels"."ward_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "provinces_code_format" CHECK ("provinces"."code" ~ '^NP[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"local_level_code" text NOT NULL,
	"ward_no" smallint NOT NULL,
	CONSTRAINT "wards_local_level_code_ward_no_unique" UNIQUE("local_level_code","ward_no"),
	CONSTRAINT "wards_ward_no_positive" CHECK ("wards"."ward_no" > 0)
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_levels" ADD CONSTRAINT "local_levels_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_local_level_code_local_levels_code_fk" FOREIGN KEY ("local_level_code") REFERENCES "public"."local_levels"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "districts_province_code_index" ON "districts" USING btree ("province_code");--> statement-breakpoint
CREATE INDEX "local_levels_district_code_index" ON "local_levels" USING btree ("district_code");