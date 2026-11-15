CREATE TABLE "confirm_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"participant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirm_tokens_token_unique" UNIQUE("token")
);

ALTER TABLE "confirm_tokens" ADD CONSTRAINT "confirm_tokens_participant_id_participants_user_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("user_id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "confirm_tokens_token_idx" ON "confirm_tokens" USING btree ("token");
CREATE INDEX "confirm_tokens_participant_idx" ON "confirm_tokens" USING btree ("participant_id");
