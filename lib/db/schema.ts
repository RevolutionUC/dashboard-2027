import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { PARTICIPANT_STATUSES } from "@/lib/participant-status";

// Event visibility enum for day-of schedule
export const scheduleVisibility = pgEnum("schedule_visibility", ["internal", "public"]);

// Access request status enum
export const accessRequestStatus = pgEnum("access_request_status", [
  "pending",
  "approved",
  "denied",
]);

export const actions = pgEnum("actions", [
  "SIGNED_IN",
  "CHECKIN",
  "WORKSHOP_CHECKIN",
  "FOOD_CHECKIN",
  "UPDATE_STATUS",
  "CREATE_EVENT",
  "UPDATE_EVENT",
  "DELETE_EVENT",
  "CREATE_SCHEDULE",
  "UPDATE_SCHEDULE",
  "DELETE_SCHEDULE",
  "APPROVE_USER",
  "DENY_USER",
  "REVOKE_USER",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  // better-auth admin plugin fields
  role: text("role").default("user"),
  // Dashboard role: admin, lead, organizer
  dashboardRole: text("dashboard_role").default("lead"),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires", { withTimezone: true }),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // better-auth admin plugin fields
    impersonatedBy: text("impersonatedBy"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================
// RevolutionUC Application Tables
// ============================================

export const participantStatus = pgEnum("participant_status", [...PARTICIPANT_STATUSES]);

export const participants = pgTable(
  "participants",
  {
    user_id: uuid("user_id").primaryKey().defaultRandom(),
    // userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    age: integer("age").notNull(),
    gender: text("gender"),
    school: text("school").notNull(),
    // graduationYear: integer("graduation_year").notNull(),
    levelOfStudy: text("level_of_study").notNull(),
    country: text("country").notNull(),
    major: text("major"),
    dietRestrictions: text("diet_restrictions"),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    shirtSize: text("shirt_size"),
    hackathons: text("hackathons"),
    raceEthnicity: text("race_ethnicity").array(),
    referralSource: text("referral_source").array(),
    resumeUrl: text("resume_url"),
    qrBase64: text("qr_base64"),
    status: participantStatus("status").notNull().default("REGISTERED"),
    checkedIn: boolean("checked_in").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("participants_email_idx").on(table.email),
    index("participants_status_idx").on(table.status),
    index("participants_userId_idx").on(table.user_id),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    eventType: text("event_type").notNull(), // CHECKIN, WORKSHOP, FOOD, etc.
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    location: text("location"),
    capacity: integer("capacity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_type_idx").on(table.eventType)],
);

// Day-of Schedule Table
export const dayOfSchedule = pgTable(
  "day_of_schedule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    location: text("location"),
    capacity: integer("capacity"),
    visibility: scheduleVisibility("visibility").notNull().default("internal"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("day_of_schedule_visibility_idx").on(table.visibility)],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    // unique index for evernts registration table
    id: uuid("id").primaryKey().defaultRandom(),
    participant_id: uuid("participant_id")
      .notNull()
      .references(() => participants.user_id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_registrations_participant_idx").on(table.participant_id),
    index("event_registrations_event_idx").on(table.eventId),
  ],
);

// ============================================
// Admin Related Tables
// ============================================

export const accessRequests = pgTable(
  "access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    status: accessRequestStatus("status").notNull().default("pending"),
    role: text("role").default("lead"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("access_requests_userId_idx").on(table.userId),
    index("access_requests_status_idx").on(table.status),
  ],
);

export const confirmTokens = pgTable(
  "confirm_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.user_id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("confirm_tokens_token_idx").on(table.token),
    index("confirm_tokens_participant_idx").on(table.participantId),
  ],
);

export const auditLogs = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    session_id: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    action: actions("action").notNull(),
    target_id: uuid("target_id"),
    details: json("details"),
    event_time: timestamp("event_time", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_user_id_idx").on(table.user_id),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_event_time_idx").on(table.event_time),
  ],
);
// Judge and Category Tables
// ============================================

export const judgingPhase = pgEnum("judging_phase", ["scoring", "finalized"]);

export const categoryType = pgEnum("category_type", ["Sponsor", "Inhouse", "General", "MLH"]);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: categoryType("type").notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("categories_type_idx").on(table.type)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  judgeGroups: many(judgeGroups),
  judges: many(judges),
  evaluations: many(evaluations),
}));

export const judgeGroups = pgTable(
  "judge_groups",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("judge_groups_category_idx").on(table.categoryId),
    index("judge_groups_name_idx").on(table.name),
  ],
);

export const judgeGroupsRelations = relations(judgeGroups, ({ one, many }) => ({
  category: one(categories, {
    fields: [judgeGroups.categoryId],
    references: [categories.id],
  }),
  judges: many(judges),
  assignments: many(assignments),
}));

export const judges = pgTable(
  "judges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    judgeGroupId: integer("judge_group_id").references(() => judgeGroups.id, {
      onDelete: "set null",
    }),
    judgingPhase: judgingPhase("judging_phase").notNull().default("scoring"),
    isCheckedin: boolean("is_checkedin").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("judges_category_idx").on(table.categoryId),
    index("judges_group_idx").on(table.judgeGroupId),
  ],
);

export const judgesRelations = relations(judges, ({ one, many }) => ({
  category: one(categories, {
    fields: [judges.categoryId],
    references: [categories.id],
  }),
  judgeGroup: one(judgeGroups, {
    fields: [judges.judgeGroupId],
    references: [judgeGroups.id],
  }),
  evaluations: many(evaluations),
}));

// ============================================
// Project Tables
// ============================================

export const projectStatus = pgEnum("project_status", ["created", "disqualified"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: projectStatus("status").notNull().default("created"),
    url: text("url"),
    location: text("location").notNull(),
    location2: text("location2").notNull(),
    disqualifyReason: text("disqualify_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("projects_status_idx").on(table.status),
    index("projects_location_idx").on(table.location),
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  submissions: many(submissions),
  assignments: many(assignments),
  evaluations: many(evaluations),
}));

export const submissions = pgTable(
  "submissions",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.categoryId] }),
    index("submissions_project_idx").on(table.projectId),
    index("submissions_category_idx").on(table.categoryId),
  ],
);

export const submissionsRelations = relations(submissions, ({ one }) => ({
  project: one(projects, {
    fields: [submissions.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [submissions.categoryId],
    references: [categories.id],
  }),
}));

// ============================================
// Assignment Tables (Project to Judge Group)
// ============================================

export const assignments = pgTable(
  "assignments",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    judgeGroupId: integer("judge_group_id")
      .notNull()
      .references(() => judgeGroups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.judgeGroupId, table.projectId] }),
    index("assignments_project_idx").on(table.projectId),
    index("assignments_judge_group_idx").on(table.judgeGroupId),
  ],
);

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  judgeGroup: one(judgeGroups, {
    fields: [assignments.judgeGroupId],
    references: [judgeGroups.id],
  }),
  project: one(projects, {
    fields: [assignments.projectId],
    references: [projects.id],
  }),
}));

// ============================================
// Evaluation Table (Judge scoring for projects)
// ============================================

export const evaluations = pgTable(
  "evaluations",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    judgeId: uuid("judge_id")
      .notNull()
      .references(() => judges.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    scores: integer("scores").array(),
    categoryRelevance: integer("category_relevance").notNull().default(0),
    categoryBordaScore: integer("category_borda_score"),
    note: text("note"),
  },
  (table) => [
    primaryKey({ columns: [table.judgeId, table.projectId] }),
    index("evaluations_project_idx").on(table.projectId),
    index("evaluations_judge_idx").on(table.judgeId),
    index("evaluations_category_idx").on(table.categoryId),
  ],
);

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
  project: one(projects, {
    fields: [evaluations.projectId],
    references: [projects.id],
  }),
  judge: one(judges, {
    fields: [evaluations.judgeId],
    references: [judges.id],
  }),
  category: one(categories, {
    fields: [evaluations.categoryId],
    references: [categories.id],
  }),
}));
