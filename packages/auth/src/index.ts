import { db } from "@howlboard/db";
import * as schema from "@howlboard/db/schema/auth";
import { user, appSettings } from "@howlboard/db/schema/auth";
import { env } from "@howlboard/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [twoFactor()],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https") ? true : false,
      httpOnly: true,
      path: "/",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          const [existingUser] = await db
            .select({ id: user.id })
            .from(user)
            .limit(1);

          // First user to register gets owner role, bypass registration lock
          if (!existingUser) {
            return {
              data: {
                ...userData,
                role: "owner",
              },
            };
          }

          // Subsequent registrations: check if registration is enabled
          const [regSetting] = await db
            .select({ value: appSettings.value })
            .from(appSettings)
            .where(eq(appSettings.key, "registration_enabled"))
            .limit(1);

          if (regSetting?.value !== "true") {
            throw new Error("Registration is closed");
          }

          return { data: userData };
        },
      },
    },
  },
});
