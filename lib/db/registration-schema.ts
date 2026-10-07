import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { participants, judges, projects } from "./schema";
export const registrationEvents = pgTable("registration_events", {
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  registrationOpen: boolean("registration_open").notNull().default(false),
  capacity: integer("capacity"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  confirmationDeadline: timestamp("confirmation_deadline", { withTimezone: true }),
  timezone: text("timezone").notNull().default("America/New_York"),
  slots: jsonb("slots").notNull().default([]),
  details: jsonb("details").notNull().default({}),
}).enableRLS();
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id")
      .notNull()
      .references(() => registrationEvents.id),
    kind: text("kind").notNull(),
    email: text("email").notNull(),
    requestId: uuid("request_id").notNull(),
    data: jsonb("data").notNull(),
    status: text("status").notNull().default("RECEIVED"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    participantId: uuid("participant_id").references(() => participants.user_id),
    judgeId: uuid("judge_id").references(() => judges.id),
    sponsorId: uuid("sponsor_id"),
    resumePath: text("resume_path"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    assignment: text("assignment"),
    internalNotes: text("internal_notes"),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    offerExpiresAt: timestamp("offer_expires_at", { withTimezone: true }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("form_submissions_event_kind_email").on(t.eventId, t.kind, t.email),
    uniqueIndex("form_submissions_request_id").on(t.requestId),
    index("form_submissions_review_idx").on(t.eventId, t.kind, t.status),
  ],
).enableRLS();
export const formConsents = pgTable(
  "form_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => formSubmissions.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => registrationEvents.id),
    answers: jsonb("answers").notNull(),
    notices: jsonb("notices").notNull(),
    version: text("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("form_consents_submission_idx").on(t.submissionId)],
).enableRLS();
export const formTokens = pgTable("form_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => formSubmissions.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
export const formNotifications = pgTable(
  "form_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => formSubmissions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    state: text("state").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lease: uuid("lease"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("form_notifications_pending_idx").on(t.state, t.availableAt)],
).enableRLS();
export const formRateLimits = pgTable("form_rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  count: integer("count").notNull().default(1),
}).enableRLS();
export const registrationReviews = pgTable("registration_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => formSubmissions.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").notNull(),
  action: text("action").notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
export const projectIntakes = pgTable(
  "project_intakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id")
      .notNull()
      .references(() => registrationEvents.id),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => formSubmissions.id),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    data: jsonb("data").notNull(),
    status: text("status").notNull().default("RECEIVED"),
    review: jsonb("review").notNull().default({}),
    reviewedBy: text("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("project_intakes_owner_unique").on(t.ownerId)],
).enableRLS();
