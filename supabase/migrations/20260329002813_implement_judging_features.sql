CREATE TYPE "public"."category_type" AS ENUM('Sponsor', 'Inhouse', 'General', 'MLH');
CREATE TYPE "public"."judging_phase" AS ENUM('scoring', 'finalized');
CREATE TYPE "public"."project_status" AS ENUM('created', 'disqualified');
CREATE TABLE "assignments" (
	"project_id" uuid NOT NULL,
	"judge_group_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_judge_group_id_project_id_pk" PRIMARY KEY("judge_group_id","project_id")
);

CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"action" "actions" NOT NULL,
	"target_id" uuid,
	"details" json,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "category_type" DEFAULT 'General' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "evaluations" (
	"project_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"scores" integer[],
	"category_relevance" integer DEFAULT 0 NOT NULL,
	"category_borda_score" integer,
	"note" text,
	CONSTRAINT "evaluations_judge_id_project_id_pk" PRIMARY KEY("judge_id","project_id")
);

CREATE TABLE "judge_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "judge_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "judges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"category_id" text NOT NULL,
	"judge_group_id" integer,
	"judging_phase" "judging_phase" DEFAULT 'scoring' NOT NULL,
	"is_checkedin" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "judges_email_unique" UNIQUE("email")
);

CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'created' NOT NULL,
	"url" text,
	"location" text NOT NULL,
	"location2" text NOT NULL,
	"disqualify_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "submissions" (
	"project_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_project_id_category_id_pk" PRIMARY KEY("project_id","category_id")
);

ALTER TABLE "event_registrations" RENAME COLUMN "user_id" TO "participant_id";
ALTER TABLE "event_registrations" DROP CONSTRAINT "event_registrations_user_id_participants_user_id_fk";

DROP INDEX "event_registrations_participant_idx";
ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'lead';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "dashboard_role" text DEFAULT 'lead';
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_judge_group_id_judge_groups_id_fk" FOREIGN KEY ("judge_group_id") REFERENCES "public"."judge_groups"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_judge_id_judges_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "judge_groups" ADD CONSTRAINT "judge_groups_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "judges" ADD CONSTRAINT "judges_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "judges" ADD CONSTRAINT "judges_judge_group_id_judge_groups_id_fk" FOREIGN KEY ("judge_group_id") REFERENCES "public"."judge_groups"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "assignments_project_idx" ON "assignments" USING btree ("project_id");
CREATE INDEX "assignments_judge_group_idx" ON "assignments" USING btree ("judge_group_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_log" USING btree ("user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_log" USING btree ("action");
CREATE INDEX "audit_logs_event_time_idx" ON "audit_log" USING btree ("event_time");
CREATE INDEX "categories_type_idx" ON "categories" USING btree ("type");
CREATE INDEX "evaluations_project_idx" ON "evaluations" USING btree ("project_id");
CREATE INDEX "evaluations_judge_idx" ON "evaluations" USING btree ("judge_id");
CREATE INDEX "evaluations_category_idx" ON "evaluations" USING btree ("category_id");
CREATE INDEX "judge_groups_category_idx" ON "judge_groups" USING btree ("category_id");
CREATE INDEX "judge_groups_name_idx" ON "judge_groups" USING btree ("name");
CREATE INDEX "judges_category_idx" ON "judges" USING btree ("category_id");
CREATE INDEX "judges_group_idx" ON "judges" USING btree ("judge_group_id");
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");
CREATE INDEX "projects_location_idx" ON "projects" USING btree ("location");
CREATE INDEX "submissions_project_idx" ON "submissions" USING btree ("project_id");
CREATE INDEX "submissions_category_idx" ON "submissions" USING btree ("category_id");
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_participant_id_participants_user_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("user_id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "event_registrations_participant_idx" ON "event_registrations" USING btree ("participant_id");
