CREATE TABLE "issued_letters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "issued_letters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"application_id" integer NOT NULL,
	"ward_id" integer NOT NULL,
	"fiscal_year" text NOT NULL,
	"serial_no" integer NOT NULL,
	"letter_no" text NOT NULL,
	"issued_date_bs" text NOT NULL,
	"verification_code" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"issued_by" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pdf_storage_key" text,
	CONSTRAINT "issued_letters_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "issued_letters_verification_code_unique" UNIQUE("verification_code"),
	CONSTRAINT "issued_letters_ward_fiscal_year_serial_unique" UNIQUE("ward_id","fiscal_year","serial_no"),
	CONSTRAINT "issued_letters_serial_positive" CHECK ("issued_letters"."serial_no" > 0),
	CONSTRAINT "issued_letters_fiscal_year_format" CHECK ("issued_letters"."fiscal_year" ~ '^[0-9]{4}/[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "letter_counters" (
	"ward_id" integer NOT NULL,
	"fiscal_year" text NOT NULL,
	"last_no" integer NOT NULL,
	CONSTRAINT "letter_counters_ward_id_fiscal_year_pk" PRIMARY KEY("ward_id","fiscal_year")
);
--> statement-breakpoint
ALTER TABLE "issued_letters" ADD CONSTRAINT "issued_letters_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_letters" ADD CONSTRAINT "issued_letters_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_letters" ADD CONSTRAINT "issued_letters_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_counters" ADD CONSTRAINT "letter_counters_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;