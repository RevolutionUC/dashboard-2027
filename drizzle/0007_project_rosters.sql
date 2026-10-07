CREATE TABLE "project_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"review" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_intakes" ADD CONSTRAINT "project_intakes_event_id_registration_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registration_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_intakes" ADD CONSTRAINT "project_intakes_owner_id_form_submissions_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."form_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_intakes" ADD CONSTRAINT "project_intakes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_intakes_owner_unique" ON "project_intakes" USING btree ("owner_id");
--> statement-breakpoint
ALTER TABLE project_intakes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON project_intakes FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON project_intakes FROM anon; END IF;
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON project_intakes FROM authenticated; END IF;
END $$;
