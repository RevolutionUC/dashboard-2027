-- Add dashboard_role column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "dashboard_role" text DEFAULT 'lead';

-- Add role column to access_requests table
ALTER TABLE "access_requests" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'lead';

-- Set admin dashboard_role for admin emails
UPDATE "user" SET "dashboard_role" = 'admin' WHERE "role" = 'admin';

-- Add REVOKE_USER to actions enum
ALTER TYPE "actions" ADD VALUE IF NOT EXISTS 'REVOKE_USER';
