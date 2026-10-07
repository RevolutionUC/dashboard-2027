# 2027 forms and organizer review

This branch is paired with the form branch in `RevolutionUC/website-2027`. The website and dashboard must use the same dedicated 2027 database. Better Auth and existing staff access approval remain in place.

## Database and rollout

The dedicated Supabase project **RevUC-2027** (`slissxtjbeylijkcjogn`) now has migrations 0000–0009 applied and the private `revuc-2027-resumes` bucket created. Its existing interest tables were retained. The Drizzle ledger records the applied source migrations; do not replay the bootstrap SQL. Migration 0009 also protects the dashboard's base tables from the public Data API. Both applications use trusted server database connections; browser publishable keys cannot read these application tables.

Database connection checks used the project's session pooler with `sslmode=verify-full` and the official root certificate downloaded from Database Settings. Configure the certificate path on each runtime host using `sslrootcert` in `DATABASE_URL`. No production deployment or mail delivery was performed, and the actual event settings remain unset with registration closed.

Run migrations from this repository with `DATABASE_URL` set to the intended development database first:

```powershell
npm ci
npx drizzle-kit migrate
```

The migrations add private registration/event settings, applications, consent history, hashed email tokens, a persistent email outbox, rate limits, staff review history, project rosters, and role check-in. They also add `WITHDRAWN` to participant status and allow deferred optional profile answers to be null. They do not delete event records or repurpose the 2026 database. Existing participant fields remain available; additional answers are stored as structured application JSON rather than comma-separated multi-select strings.

New tables have RLS enabled and no public/anon/authenticated grants. Both applications need a trusted server database role. On Supabase the migration creates a private PDF-only 4 MB resume bucket. On plain PostgreSQL it skips that storage step, so configure private Supabase Storage separately as described in the website guide. Back up an existing database before applying new migrations and deploy both linked branches together after review. The website needs the new schema before accepting forms.

Set `WEBSITE_URL` to the public website origin. Event dates, capacity, confirmation deadline, timezone, availability slots, policies, and optional questions are configured in **Registration**. Hacker registration is closed until actual settings are entered. Opening it queues registration announcements only for verified, active interest applicants who have not already registered. Keep the existing slot IDs once applicants have selected them; update labels when coordinating a schedule change.

## Organizer workflow

Approved leads and admins can review applications and download MLH/logistics/role exports. MLH export requires a confirmed 2027 partnership in event settings, in line with the pending-partnership notice on the form. Organizers who only operate check-in can use QR lookup/check-in but cannot read full private form answers or export them. Pending/revoked dashboard accounts cannot use these endpoints. Applicant approval does not create general dashboard access.

Review verified judge/mentor applications, availability, expertise, and conflicts. Choose a category when approving a Judge; a Mentor-only approval does not create a judge record. Approved applicants can submit their logistics through their email link. Assign shifts, save private notes and follow-up dates, send reminders, and check in approved role applicants. Linked judges with withdrawn/declined applications cannot continue through the judging portal. Existing manually-created judges without application records retain the current workflow.

Approve a sponsor company before approving its individual representatives. Match representatives to the approved company explicitly and require their resume-use agreement. Their resume book shows only opted-in confirmed/checked-in hackers, with recruiting contact permission enforced separately. No accommodation, food, emergency, or unnecessary demographic details are exported to sponsors.

Verified hacker applications create participants. If an existing participant already has that email, review it and use **Link existing participant**; public forms cannot silently overwrite it. Attendance changes check capacity under the same event lock as website RSVP. Confirmed hackers can be checked in through QR; registered, waitlisted, and withdrawn hackers need an appropriate attendance decision first. Withdrawal preserves historical records and promotes the next waiting verified hacker. Offers reserve a place for at most 24 hours and require the website notification worker to expire them and deliver mail.

The panel separates interest, received/unverified applications, registered, confirmed, waitlisted, checked-in, and approved role counts. Failed emails can be retried after correcting mail configuration. The website worker owns both notifications and queued storage cleanup; configure its included scheduled workflow or hosting scheduler. Manual legacy Mailgun email templates still use the dashboard provider. Attendance templates now use the configured event dates/deadline/check-in instructions and generate fragment-based, hashed confirmation links.

During the event, enable project submissions only after entering the approved rules and maximum team size. Checked-in hackers submit actual team registration emails, GitHub usernames, Devpost/source/demo links, categories, and disclosures. Import the project through the existing Devpost workflow, then use **Project and team roster review** to compare identities with verification/check-in and organizer-recorded Devpost/GitHub lists. Differences require review notes before completing the review. This never automatically disqualifies or assigns a project. Imports can replace project IDs in the existing workflow; `project_intakes.project_id` becomes null on deletion so a lead must relink and review the new import.

## Field storage and handoff

| Information                                                                                                             | Where it lives                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Core hacker contact/school/age + optional major/diet/shirt/profiles                                                     | Existing `participants` columns after email verification                          |
| Graduation year, preferred name, pronouns, skills/team plans, allergies/access needs, optional travel/emergency answers | `form_submissions.data`                                                           |
| Judge/mentor availability, experience, expertise, conflicts, briefing and conduct answers                               | `form_submissions.data`; approved judges link through `judge_id`                  |
| Sponsor inquiry, contact/tier/goals/contributions, later booth/brand/billing details                                    | `form_submissions.data`                                                           |
| Representative's approved company                                                                                       | `form_submissions.sponsor_id`                                                     |
| Resume                                                                                                                  | Private storage object path in `form_submissions.resume_path`; no public URL      |
| Agreements                                                                                                              | `form_consents` append-only snapshots with wording, timestamp, event, and version |
| Review decisions/actor                                                                                                  | `registration_reviews`; event settings edits also use the existing audit log      |
| Role assignment/follow-up/check-in                                                                                      | Application assignment, private notes, follow-up time, `checked_in_at`            |
| Project actual roster and rule acknowledgement                                                                          | `project_intakes.data`; staff comparison/resolution in its review JSON            |

Set the actual retention wording with the team before opening registration. Export only the fields needed by the recipient. Deleting resumes includes the private object, not just its database reference. Keep historical backups and sponsor deletion requests within the agreed retention process.

## Disposable local database and tests

Do not use production credentials for these commands.

```powershell
docker run -d --name revuc-2027-forms-test -e POSTGRES_USER=revuc -e POSTGRES_PASSWORD=revuc_local -e POSTGRES_DB=revuc_forms_test -p 127.0.0.1:55437:5432 postgres:16-alpine
$env:DATABASE_URL='postgres://revuc:revuc_local@127.0.0.1:55437/revuc_forms_test'
npx drizzle-kit migrate
npm test
```

Run the website integration tests first to populate the disposable fixtures. For the dashboard HTTP tests, start a separate local dashboard terminal with:

```powershell
$env:DATABASE_URL='postgres://revuc:revuc_local@127.0.0.1:55437/revuc_forms_test'
$env:BETTER_AUTH_SECRET='local-test-only-auth-secret-at-least-32-characters'
$env:BETTER_AUTH_URL='http://localhost:3002'
$env:WEBSITE_URL='http://localhost:3001'
$env:GITHUB_CLIENT_ID='local-test'
$env:GITHUB_CLIENT_SECRET='local-test'
$env:MAILGUN_API_KEY='local-test-no-network'
npm run dev -- --port 3002 --hostname 127.0.0.1
```

Then `npm run test:http` with the local `DATABASE_URL` set. The tests refuse external databases and nonlocal test servers. They create only synthetic local staff sessions, verify anonymous/pending/organizer restrictions, test origin/JSON validation, judge approval and its audit, and reject withdrawn QR check-in. They do not run OAuth or send mail.

Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`. At the starting main revision `29fe9d9`, the dashboard already reports 19 TypeScript diagnostics in event/schedule routes, the event page's missing `Label` import, pending approval, and existing route/auth helpers. The untouched main checkout produces the same diagnostics. These are outside this form change and still block a clean dashboard production build; address them separately before deploying the combined workflow.

Branch validation: unit and local HTTP permission/review tests pass; lint has zero errors and 20 existing warnings. Browser checks covered event settings save, applicant review/focus/notes, and mobile layout. The production bundle compiles, then stops at the existing missing `Label` import. A final typecheck comparison matches all 19 diagnostics from unchanged main.
