ALTER TABLE registration_events ADD CONSTRAINT registration_capacity_positive CHECK (capacity IS NULL OR capacity > 0);
ALTER TABLE registration_events ADD CONSTRAINT registration_dates_ordered CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at > starts_at));
ALTER TABLE registration_events ADD CONSTRAINT registration_ready CHECK (NOT registration_open OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND capacity IS NOT NULL));
ALTER TABLE form_submissions ADD CONSTRAINT form_kind_valid CHECK (kind IN ('interest','hacker','judge-mentor','sponsor','volunteer','speaker','sponsor-representative'));
ALTER TABLE form_submissions ADD CONSTRAINT form_status_valid CHECK (status IN ('INTEREST','RECEIVED','APPROVED','DECLINED','ASSIGNED','REGISTERED','CONFIRMED','WAITLISTED','WITHDRAWN','CHECKED_IN'));
ALTER TABLE form_submissions ADD CONSTRAINT form_email_normalized CHECK (email = lower(btrim(email)));
ALTER TABLE form_submissions ADD CONSTRAINT form_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES form_submissions(id);
ALTER TABLE form_notifications ADD CONSTRAINT notification_state_valid CHECK (state IN ('pending','sending','sent','failed'));
ALTER TABLE form_notifications ADD CONSTRAINT notification_attempts_valid CHECK (attempts >= 0);
CREATE INDEX form_tokens_owner_idx ON form_tokens(submission_id);
CREATE INDEX form_submissions_waitlist_idx ON form_submissions(event_id,updated_at) WHERE status='WAITLISTED';
--> statement-breakpoint
INSERT INTO registration_events (id,year,details) VALUES ('revuc-2027',2027,'{"accessibilityContact":"info@revolutionuc.com","expensePolicy":"Contact the organizers to confirm arrangements before booking travel.","privacyNotice":"We use your answers to organize RevolutionUC and contact you about your application. Sponsor resume sharing and recruiting contact are optional. Contact info@revolutionuc.com to request help with your information."}'::jsonb);
--> statement-breakpoint
-- These tables contain personal data and management tokens. All access is through
-- validated server handlers using a trusted database role, never the public Data API.
ALTER TABLE registration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON registration_events,form_submissions,form_consents,form_tokens,form_notifications,form_rate_limits FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON registration_events,form_submissions,form_consents,form_tokens,form_notifications,form_rate_limits FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON registration_events,form_submissions,form_consents,form_tokens,form_notifications,form_rate_limits FROM authenticated;
  END IF;
END $$;
--> statement-breakpoint
-- Plain PostgreSQL development databases may not have the Supabase Storage schema.
-- On Supabase, create a private PDF-only bucket. No anonymous storage policies.
DO $$ BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
    VALUES ('revuc-2027-resumes','revuc-2027-resumes',false,4194304,ARRAY['application/pdf'])
    ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=4194304,allowed_mime_types=ARRAY['application/pdf'];
  END IF;
END $$;
