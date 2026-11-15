-- ============================================================
-- Row-level security
-- ============================================================
-- All database access goes through the server with the Supabase secret key
-- (service_role), which bypasses RLS. Enabling RLS with no policies blocks
-- the public (publishable/anon) key from reading or writing these tables
-- through the Data API.

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "day_of_schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "confirm_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "judge_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "judges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluations" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Transaction functions (called with supabase.rpc())
-- ============================================================
-- supabase-js can't run multi-statement transactions, so each operation that
-- must be atomic lives in a function. A function body runs in one transaction.

-- Replace all project→judge-group assignments and their evaluation rows.
-- p_assignments: [{ "project_id": uuid, "judge_group_id": int }]
-- p_evaluations: [{ "project_id": uuid, "judge_id": uuid, "category_id": text }]
CREATE OR REPLACE FUNCTION public.replace_assignments(p_assignments jsonb, p_evaluations jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM assignments WHERE true;
  INSERT INTO assignments (project_id, judge_group_id)
  SELECT (a->>'project_id')::uuid, (a->>'judge_group_id')::integer
  FROM jsonb_array_elements(p_assignments) AS a;

  DELETE FROM evaluations WHERE true;
  INSERT INTO evaluations (project_id, judge_id, category_id)
  SELECT (e->>'project_id')::uuid, (e->>'judge_id')::uuid, e->>'category_id'
  FROM jsonb_array_elements(p_evaluations) AS e;
END;
$$;

-- Delete all evaluations and assignments.
CREATE OR REPLACE FUNCTION public.clear_assignments()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM evaluations WHERE true;
  DELETE FROM assignments WHERE true;
END;
$$;

-- Replace all projects and submissions with an imported set.
-- p_projects: [{ "name", "location", "location2", "url", "category_ids": [text] }]
CREATE OR REPLACE FUNCTION public.replace_projects(p_projects jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p jsonb;
  new_project_id uuid;
  imported integer := 0;
BEGIN
  DELETE FROM submissions WHERE true;
  DELETE FROM projects WHERE true;

  FOR p IN SELECT * FROM jsonb_array_elements(p_projects) LOOP
    INSERT INTO projects (name, location, location2, url, status)
    VALUES (p->>'name', p->>'location', p->>'location2', p->>'url', 'created')
    RETURNING id INTO new_project_id;

    INSERT INTO submissions (project_id, category_id)
    SELECT new_project_id, c
    FROM jsonb_array_elements_text(COALESCE(p->'category_ids', '[]'::jsonb)) AS c;

    imported := imported + 1;
  END LOOP;

  RETURN imported;
END;
$$;

-- Disqualify projects by name.
-- p_updates: [{ "name": text, "reason": text }]
CREATE OR REPLACE FUNCTION public.disqualify_projects(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  u jsonb;
BEGIN
  FOR u IN SELECT * FROM jsonb_array_elements(p_updates) LOOP
    UPDATE projects
    SET disqualify_reason = u->>'reason', status = 'disqualified'
    WHERE name = u->>'name';
  END LOOP;
END;
$$;

-- Replace all judge groups and assign judges to the new groups.
-- p_groups: [{ "name": text, "category_id": text, "judge_ids": [uuid] }]
CREATE OR REPLACE FUNCTION public.replace_judge_groups(p_groups jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  g jsonb;
  new_group_id integer;
  created integer := 0;
BEGIN
  DELETE FROM judge_groups WHERE true;

  FOR g IN SELECT * FROM jsonb_array_elements(p_groups) LOOP
    INSERT INTO judge_groups (name, category_id)
    VALUES (g->>'name', g->>'category_id')
    RETURNING id INTO new_group_id;

    UPDATE judges
    SET judge_group_id = new_group_id
    WHERE id IN (
      SELECT j::uuid FROM jsonb_array_elements_text(COALESCE(g->'judge_ids', '[]'::jsonb)) AS j
    );

    created := created + 1;
  END LOOP;

  RETURN created;
END;
$$;

-- Only the server (service_role) may call these functions.
REVOKE EXECUTE ON FUNCTION public.replace_assignments(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_assignments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_projects(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.disqualify_projects(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_judge_groups(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_assignments(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_assignments() TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_projects(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.disqualify_projects(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_judge_groups(jsonb) TO service_role;
