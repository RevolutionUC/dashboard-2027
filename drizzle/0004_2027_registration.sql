ALTER TYPE "public"."participant_status" ADD VALUE 'WITHDRAWN';--> statement-breakpoint
CREATE TABLE "form_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"notices" jsonb NOT NULL,
	"version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"lease" uuid,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"kind" text NOT NULL,
	"email" text NOT NULL,
	"request_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"participant_id" uuid,
	"judge_id" uuid,
	"sponsor_id" uuid,
	"resume_path" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"assignment" text,
	"internal_notes" text,
	"follow_up_at" timestamp with time zone,
	"offer_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "registration_events" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"registration_open" boolean DEFAULT false NOT NULL,
	"capacity" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"confirmation_deadline" timestamp with time zone,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "gender" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "major" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "shirt_size" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "hackathons" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_consents" ADD CONSTRAINT "form_consents_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_consents" ADD CONSTRAINT "form_consents_event_id_registration_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registration_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_notifications" ADD CONSTRAINT "form_notifications_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_event_id_registration_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."registration_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_participant_id_participants_user_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_judge_id_judges_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_tokens" ADD CONSTRAINT "form_tokens_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_consents_submission_idx" ON "form_consents" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "form_notifications_pending_idx" ON "form_notifications" USING btree ("state","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "form_submissions_event_kind_email" ON "form_submissions" USING btree ("event_id","kind","email");--> statement-breakpoint
CREATE UNIQUE INDEX "form_submissions_request_id" ON "form_submissions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "form_submissions_review_idx" ON "form_submissions" USING btree ("event_id","kind","status");