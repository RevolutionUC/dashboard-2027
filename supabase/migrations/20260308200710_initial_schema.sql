CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'denied');
CREATE TYPE "public"."participant_status" AS ENUM('REGISTERED', 'CONFIRMED', 'WAITLISTED', 'CHECKED_IN');
CREATE TYPE "public"."schedule_visibility" AS ENUM('internal', 'public');
CREATE TYPE "public"."actions" AS ENUM('SIGNED_IN', 'CHECKIN', 'WORKSHOP_CHECKIN', 'FOOD_CHECKIN', 'UPDATE_STATUS', 'CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT', 'CREATE_SCHEDULE', 'UPDATE_SCHEDULE', 'DELETE_SCHEDULE', 'APPROVE_USER', 'DENY_USER', 'REVOKE_USER');

CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text
);

CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE "day_of_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"location" text,
	"capacity" integer,
	"visibility" "schedule_visibility" DEFAULT 'internal' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"event_type" text NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"location" text,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "participants" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"school" text NOT NULL,
	"level_of_study" text NOT NULL,
	"country" text NOT NULL,
	"major" text NOT NULL,
	"diet_restrictions" text,
	"linkedin_url" text,
	"github_url" text,
	"shirt_size" text NOT NULL,
	"hackathons" text NOT NULL,
	"race_ethnicity" text[],
	"referral_source" text[],
	"resume_url" text,
	"qr_base64" text,
	"status" "participant_status" DEFAULT 'REGISTERED' NOT NULL,
	"checked_in" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_email_unique" UNIQUE("email")
);

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"banReason" text,
	"banExpires" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "day_of_schedule" ADD CONSTRAINT "day_of_schedule_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_participants_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."participants"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "access_requests_userId_idx" ON "access_requests" USING btree ("user_id");
CREATE INDEX "access_requests_status_idx" ON "access_requests" USING btree ("status");
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");
CREATE INDEX "day_of_schedule_visibility_idx" ON "day_of_schedule" USING btree ("visibility");
CREATE INDEX "event_registrations_participant_idx" ON "event_registrations" USING btree ("user_id");
CREATE INDEX "event_registrations_event_idx" ON "event_registrations" USING btree ("event_id");
CREATE INDEX "events_type_idx" ON "events" USING btree ("event_type");
CREATE INDEX "participants_email_idx" ON "participants" USING btree ("email");
CREATE INDEX "participants_status_idx" ON "participants" USING btree ("status");
CREATE INDEX "participants_userId_idx" ON "participants" USING btree ("user_id");
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
