import "./unit-env";
import test from "node:test";
import assert from "node:assert/strict";
import { validateSettings } from "../lib/registration/settings";
import { csvCell } from "../lib/registration/service";
import { rosterDifferences } from "../lib/registration/projects";
import { renderTemplateToText } from "../lib/templates";
import { pool } from "../lib/db";
const base = {
  registrationOpen: false,
  capacity: null,
  startsAt: null,
  endsAt: null,
  confirmationDeadline: null,
  timezone: "America/New_York",
  slots: [],
  details: {},
};
test("registration can't open without the actual event configuration", () => {
  assert.throws(() => validateSettings({ ...base, registrationOpen: true }));
  assert.throws(() => validateSettings({ ...base, capacity: -1 }));
  assert.throws(() => validateSettings({ ...base, timezone: "invalid" }));
});
test("event times and selected role slots validate before saving", () => {
  assert.throws(() =>
    validateSettings({ ...base, startsAt: "2027-04-10T10:00Z", endsAt: "2027-04-09T10:00Z" }),
  );
  assert.throws(() =>
    validateSettings({ ...base, slots: [{ id: "a", label: "April 10", roles: ["admin"] }] }),
  );
  assert.throws(() =>
    validateSettings({
      ...base,
      slots: [
        { id: "a", label: "April 10", roles: ["Mentor"] },
        { id: "a", label: "April 11", roles: ["Judge"] },
      ],
    }),
  );
});
test("project submissions require approved rules and a team size", () => {
  assert.throws(() => validateSettings({ ...base, details: { projectSubmissionOpen: true } }));
  assert.equal(
    validateSettings({
      ...base,
      details: { projectSubmissionOpen: true, maxTeamSize: 4, projectRules: "Approved rules" },
    }).details.maxTeamSize,
    4,
  );
});
test("policy links reject unsafe schemes and embedded credentials", () => {
  assert.throws(() => validateSettings({ ...base, details: { waiverUrl: "javascript:alert(1)" } }));
  assert.throws(() =>
    validateSettings({ ...base, details: { scheduleUrl: "https://user:pass@example.com" } }),
  );
});
test("CSV exports escape quotes and spreadsheet formulas", () => {
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(["Vegan", "Gluten-free"]), '"Vegan; Gluten-free"');
});
test("roster comparison checks identities rather than only member counts", () => {
  assert.deepEqual(
    rosterDifferences(["A@example.com", "b@example.com"], ["a@example.com", "c@example.com"]),
    { missing: ["b@example.com"], extra: ["c@example.com"] },
  );
});
test("attendance emails use configured dates and omit the old March 2026 schedule", async () => {
  const text = await renderTemplateToText("confirm-attendance", {
    firstName: "Test",
    eventDetails: {
      year: 2027,
      dates: "April 10–11, 2027",
      deadline: "April 5, 2027",
      venue: "Test venue",
      checkInInfo: "Check-in at 9 am",
      scheduleUrl: "https://example.com/schedule",
    },
  });
  assert.match(text!, /April 10–11, 2027/);
  assert.match(text!, /April 5, 2027/);
  assert.doesNotMatch(text!, /March 2026|March 29|March 30/);
});
test.after(() => pool.end());
