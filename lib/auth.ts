import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "./db";
import * as schema from "./db/schema";
import { accessRequests } from "./db/schema";
import { sendAccessRequestEmail } from "./email";
import { logAction } from "./audit";

if (
  !process.env.BETTER_AUTH_SECRET ||
  !process.env.BETTER_AUTH_URL ||
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET
) {
  throw new Error("BETTER AUTH SECRET, URL OR GOOGLE CLIENT ID OR SECRET MISSING ");
}

// Admin emails that automatically get admin role
const ADMIN_EMAILS = ["bilwarad@mail.uc.edu", "karthikeya.rachamolla@gmail.com", "adit.kulkarni27@gmail.com"];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // Look up the user to get name + email for the audit log
          const [usr] = await db
            .select({
              id: schema.user.id,
              name: schema.user.name,
              email: schema.user.email,
            })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);

          if (usr) {
            await logAction({
              userId: usr.id,
              name: usr.name,
              email: usr.email,
              action: "SIGNED_IN",
              sessionId: session.id,
            });
          }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

          if (isAdmin) {
            // Auto-approve admins: set role to admin and create an approved access request
            await db.update(schema.user).set({ role: "admin", dashboardRole: "admin" }).where(eq(schema.user.id, user.id));

            await db.insert(accessRequests).values({
              userId: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              status: "approved",
              role: "admin",
              reviewedAt: new Date(),
            });
          } else {
            // Create a pending access request
            await db.insert(accessRequests).values({
              userId: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              status: "pending",
            });

            // Notify admin emails about the new access request
            for (const adminEmail of ADMIN_EMAILS) {
              sendAccessRequestEmail(adminEmail, user.name, user.email).catch((err: unknown) =>
                console.error(`Failed to send access request email to ${adminEmail}:`, err),
              );
            }
          }
        },
      },
    },
  },
});

/**
 * Assert that the current request is authenticated.
 * Throws an error if the user is not logged in.
 */
export async function assertAuthorization(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
}

export async function getSessionWithRole() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const [userData] = await db
    .select({ dashboardRole: schema.user.dashboardRole })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  return {
    session,
    dashboardRole: userData?.dashboardRole || "lead",
  };
}
