import { db } from "@howlboard/db";
import * as schema from "@howlboard/db/schema/auth";
import { user } from "@howlboard/db/schema/index";
import { env } from "@howlboard/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https") ? true : false,
      httpOnly: true,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "viewer",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // First user to register gets admin role
          const [existingUser] = await db
            .select({ id: user.id })
            .from(user)
            .limit(1);

          if (!existingUser) {
            return {
              data: {
                ...userData,
                role: "admin",
              },
            };
          }

          return { data: userData };
        },
      },
    },
  },
});
