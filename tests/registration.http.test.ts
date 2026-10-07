import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { createHmac, randomUUID } from "node:crypto";
const url = new URL(process.env.DATABASE_URL ?? "postgres://invalid/invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/revuc_forms_test")
  throw new Error("HTTP tests require the isolated local revuc_forms_test database.");
const base = process.env.TEST_DASHBOARD_URL ?? "http://localhost:3002";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw new Error("Only a local test server is allowed.");
const secret = "local-test-only-auth-secret-at-least-32-characters";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const cookies: Record<string, string> = {};
async function session(label: string, role: string, approved: boolean) {
  const id = `form-test-${label}`,
    token = `test-session-${label}-${randomUUID()}`;
  await pool.query(
    'INSERT INTO "user"(id,name,email,"emailVerified",role,dashboard_role) VALUES($1,$2,$3,true,$4,$4) ON CONFLICT(id) DO UPDATE SET dashboard_role=$4',
    [id, label, `${label}@example.com`, role],
  );
  await pool.query(
    'INSERT INTO session(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now())',
    [randomUUID(), token, id],
  );
  await pool.query("DELETE FROM access_requests WHERE user_id=$1", [id]);
  await pool.query(
    "INSERT INTO access_requests(user_id,email,name,status,role) VALUES($1,$2,$3,$4,$5)",
    [id, `${label}@example.com`, label, approved ? "approved" : "pending", role],
  );
  cookies[label] =
    `better-auth.session_token=${encodeURIComponent(token + "." + createHmac("sha256", secret).update(token).digest("base64"))}`;
}
async function request(
  path: string,
  label?: string,
  method = "GET",
  body?: unknown,
  origin = base,
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(label ? { cookie: cookies[label] } : {}),
      ...(method !== "GET" ? { "Content-Type": "application/json", origin } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
test("registration HTTP permissions and review", async (t) => {
  await session("admin", "admin", true);
  await session("lead", "lead", true);
  await session("pending", "lead", false);
  await session("organizer", "organizer", true);
  await t.test(
    "private lists and exports reject anonymous, pending, and organizer accounts",
    async () => {
      for (const label of [undefined, "pending", "organizer"])
        for (const path of [
          "/api/registration",
          "/api/registration/export?mode=mlh",
          "/api/registration/projects",
        ]) {
          const response = await request(path, label);
          assert.equal(response.status, 403);
        }
    },
  );
  await t.test(
    "approved leads can review without exposing token hashes or resume paths",
    async () => {
      const response = await request("/api/registration", "lead");
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(Array.isArray(data.rows));
      for (const row of data.rows) {
        assert.equal(row.token_hash, undefined);
        assert.equal(row.resume_path, undefined);
      }
    },
  );
  await t.test("mutations reject cross-origin requests", async () => {
    const response = await request(
      "/api/registration/settings",
      "admin",
      "PUT",
      {},
      "https://evil.example",
    );
    assert.equal(response.status, 403);
  });
  await t.test("invalid settings and malformed JSON return input errors", async () => {
    assert.equal(
      (await request("/api/registration/settings", "admin", "PUT", { registrationOpen: true }))
        .status,
      400,
    );
    const bad = await fetch(`${base}/api/registration/settings`, {
      method: "PUT",
      headers: { cookie: cookies.admin, origin: base, "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(bad.status, 400);
  });
  await t.test("judge approval requires verification and a category and is audited", async () => {
    const id = randomUUID();
    const answers = {
      fullName: "Review judge",
      roles: ["Judge"],
      conflicts: "None",
      email: "reviewjudge@example.com",
    };
    await pool.query(
      "INSERT INTO form_submissions(id,event_id,kind,email,request_id,data) VALUES($1,'revuc-2027','judge-mentor','reviewjudge@example.com',$2,$3) ON CONFLICT(event_id,kind,email) DO UPDATE SET email_verified_at=NULL,status='RECEIVED'",
      [id, randomUUID(), JSON.stringify(answers)],
    );
    const row = (
      await pool.query("SELECT id FROM form_submissions WHERE email='reviewjudge@example.com'")
    ).rows[0];
    assert.equal(
      (
        await request(`/api/registration/${row.id}`, "lead", "PATCH", {
          action: "approve",
          categoryId: "general",
        })
      ).status,
      409,
    );
    await pool.query("UPDATE form_submissions SET email_verified_at=now() WHERE id=$1", [row.id]);
    assert.equal(
      (await request(`/api/registration/${row.id}`, "lead", "PATCH", { action: "approve" })).status,
      400,
    );
    assert.equal(
      (
        await request(`/api/registration/${row.id}`, "lead", "PATCH", {
          action: "approve",
          categoryId: "general",
        })
      ).status,
      200,
    );
    assert.ok(
      (
        await pool.query(
          "SELECT id FROM registration_reviews WHERE submission_id=$1 AND action='approve'",
          [row.id],
        )
      ).rows.length,
    );
  });
  await t.test("settings save is audited and MLH export respects partnership status", async () => {
    const old = (await pool.query("SELECT * FROM registration_events WHERE id='revuc-2027'"))
      .rows[0];
    const settings = {
      registrationOpen: old.registration_open,
      capacity: Math.max(old.capacity ?? 0, 10),
      startsAt: old.starts_at,
      endsAt: old.ends_at,
      confirmationDeadline: old.confirmation_deadline,
      timezone: old.timezone,
      slots: old.slots,
      details: { ...old.details, mlhPartnerConfirmed: false },
    };
    assert.equal(
      (await request("/api/registration/settings", "lead", "PUT", settings)).status,
      200,
    );
    assert.ok(
      (
        await pool.query(
          "SELECT id FROM audit_log WHERE user_id='form-test-lead' AND action='UPDATE_EVENT'",
        )
      ).rows.length,
    );
    assert.equal((await request("/api/registration/export?mode=mlh", "lead")).status, 409);
    assert.equal(
      (
        await request("/api/registration/settings", "lead", "PUT", {
          ...settings,
          details: { ...settings.details, mlhPartnerConfirmed: true },
        })
      ).status,
      200,
    );
    const exported = await request("/api/registration/export?mode=mlh", "lead");
    assert.equal(exported.status, 200);
    assert.match(await exported.text(), /first_name/);
    await request("/api/registration/settings", "lead", "PUT", settings);
  });
  await t.test("approved roles have connected assignments and check-in", async () => {
    const row = (
      await pool.query(
        "SELECT id,judge_id FROM form_submissions WHERE email='reviewjudge@example.com'",
      )
    ).rows[0];
    assert.equal(
      (
        await request(`/api/registration/${row.id}`, "lead", "PATCH", {
          action: "assign",
          assignment: "General judging, afternoon",
        })
      ).status,
      200,
    );
    assert.equal(
      (await request(`/api/registration/${row.id}`, "lead", "PATCH", { action: "check-in-role" }))
        .status,
      200,
    );
    assert.ok(
      (await pool.query("SELECT checked_in_at FROM form_submissions WHERE id=$1", [row.id])).rows[0]
        .checked_in_at,
    );
    assert.equal(
      (await pool.query("SELECT is_checkedin FROM judges WHERE id=$1", [row.judge_id])).rows[0]
        .is_checkedin,
      true,
    );
  });
  await t.test(
    "QR lookup requires approved staff, and a withdrawn hacker cannot check in",
    async () => {
      const p = (
        await pool.query("SELECT user_id FROM participants WHERE status='WITHDRAWN' LIMIT 1")
      ).rows[0];
      assert.ok(p);
      assert.equal((await request(`/api/qr?id=${p.user_id}`)).status, 403);
      assert.equal(
        (await request("/api/qr", "organizer", "POST", { user_id: p.user_id, mode: "checkin" }))
          .status,
        409,
      );
    },
  );
});
test.after(() => pool.end());
