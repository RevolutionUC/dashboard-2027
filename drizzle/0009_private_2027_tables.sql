-- The website and dashboard use trusted server connections. Keep every new
-- application table, including Better Auth records, off the public Data API.
-- Existing legacy interest tables are intentionally outside this migration.
DO $$
DECLARE table_name text;
DECLARE role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'access_requests','account','day_of_schedule','event_registrations','events',
    'participants','session','user','verification','confirm_tokens','assignments',
    'audit_log','categories','evaluations','judge_groups','judges','projects',
    'submissions','form_consents','form_notifications','form_rate_limits',
    'form_submissions','form_tokens','registration_events','registration_reviews',
    'project_intakes'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', table_name);
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
