CREATE TABLE "registration_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE registration_reviews ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON registration_reviews FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON registration_reviews FROM anon; END IF;
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON registration_reviews FROM authenticated; END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "registration_reviews" ADD CONSTRAINT "registration_reviews_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
