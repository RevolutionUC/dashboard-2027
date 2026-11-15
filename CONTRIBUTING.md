# Contributing

Thanks for helping improve the RevolutionUC dashboard.

## Development Setup

- Prereqs: Node.js (recommended: 20 LTS), npm, and a Supabase project.
- Install dependencies: `npm install`
- Environment:
  - Copy `.env.example` to `.env`
  - Fill in required values (at minimum):
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase Auth, email + password)
    - `SUPABASE_SECRET_KEY` (server-only; used for all database queries)
    - `DATABASE_URL` (only needed to apply migrations)
- Run locally: `npm run dev`

## Before You Push (Required)

Run a production build every time before pushing:

```bash
npm run build
```

If the build fails, fix it before pushing.

## Code Quality

```bash
# Lint
npm run lint

# Format
npm run format
```

## Database Changes (Supabase)

All queries use `supabase-js` on the server (`db` from `lib/db`, which uses the secret key).
The schema lives in SQL migrations under `supabase/migrations/`.

```bash
# Create a new migration file, then write the SQL in it
npx supabase migration new <name>

# Apply pending migrations
npm run db:push
```

`DATABASE_URL` is required for `db:push`.

After changing the schema, update `lib/db/types.ts` to match (or regenerate it with
`npx supabase gen types typescript --project-id <project-ref> > lib/db/types.ts`).

### Migrations Workflow (Required)

- Commit the new file in `supabase/migrations/` in every PR that changes the schema.
- Keep row-level security enabled on every new table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
  The app only reads and writes through the server with the secret key, so tables need no policies.
- Operations that must be atomic go in a Postgres function called with `db.rpc()`.
- Always run migrations on staging first when possible.

## Roles (Supabase RBAC)

Roles (`admin`, `lead`, `organizer`) are never hard-coded. They live in `public.user_roles`, and the
Custom Access Token Hook (`public.custom_access_token_hook`) adds the role to each user's JWT as the
`user_role` claim. The server reads that verified claim (`getAccessInfo` in `lib/auth.ts`).
No row in `user_roles` means the user is not approved.

- Enable the hook once per project: Supabase dashboard → Authentication → Hooks →
  Customize Access Token (JWT) Claims → `public.custom_access_token_hook`.
- Admins grant/change/remove roles on **Admin → Approvals**.
- Bootstrap the first admin in the SQL Editor (after they've signed up):

  ```sql
  insert into public.user_roles (user_id, role)
  select id, 'admin' from auth.users where email = 'someone@example.com'
  on conflict (user_id) do update set role = excluded.role, updated_at = now();
  ```

- Role changes apply when the user's access token refreshes (at most the JWT expiry,
  configurable in Authentication → Sessions). The pending-approval page refreshes immediately.

## Branch + Rebase Workflow

- Create a branch for your change: `feat/...`, `fix/...`, `chore/...`, etc.
- Rebase on `main` before opening a PR:

```bash
git fetch origin
git rebase origin/main
```

- Resolve all merge conflicts locally before opening a PR.
- Do not request reviews from admins/web leads until conflicts are fully resolved.

If you rebase after pushing your branch, you may need to force-push:

```bash
git push --force-with-lease
```

## PR Guidelines

- PRs must be small and focused. Prefer multiple small PRs over one large PR.
- Avoid mixing unrelated changes (refactors + features + formatting) in one PR.
- Include context: what changed, why it changed, and how to verify.
- Follow `.github/PULL_REQUEST_TEMPLATE.md`.
- We do not use squash-and-merge. Keep your commit history clean and reviewable.

## Commit Guidelines

- Commits should be small, concise, and descriptive.
- Use this commit message format:

```
type(scope): subject
```

Example:

```
update(ui/cleanup): update ui to be more concise
```

## Security

- Never commit secrets (e.g., `.env`, API keys, production database URLs).
- If you suspect a secret was committed, rotate it immediately and remove it from git history.
