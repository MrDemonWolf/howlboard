import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../index";
import { db } from "@howlboard/db";
import { user } from "@howlboard/db/schema/auth";
import { appSettings } from "@howlboard/db/schema/auth";
import { board } from "@howlboard/db/schema/boards";
import { env } from "@howlboard/env/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

const SETTINGS_KEYS = {
  REGISTRATION_ENABLED: "registration_enabled",
  TOS_CONTENT: "tos_content",
  PRIVACY_CONTENT: "privacy_content",
} as const;

const DEFAULT_TOS = `# Terms of Service

**Last updated: ${new Date().toISOString().split("T")[0]}**

## 1. Acceptance of Terms
By accessing and using this HowlBoard instance, you agree to be bound by these Terms of Service.

## 2. Account Terms
- You are responsible for maintaining the security of your account and password.
- You are responsible for all content posted and activity that occurs under your account.

## 3. Acceptable Use
- You may not use this service for any illegal or unauthorized purpose.
- You must not abuse, harass, threaten, or intimidate other users.

## 4. Content
- You retain ownership of all content you create on this platform.
- You grant this instance the right to store and serve your content as part of the service.

## 5. Termination
- We reserve the right to suspend or terminate your account at any time for any reason.
- You may delete your account at any time from your profile settings.

## 6. Limitation of Liability
This service is provided "as is" without warranties of any kind.

## 7. Contact
For questions about these terms, contact the instance administrator.
`;

const DEFAULT_PRIVACY = `# Privacy Policy

**Last updated: ${new Date().toISOString().split("T")[0]}**

## 1. Information We Collect
- **Account information**: name, email address, password (hashed).
- **Content**: drawings, boards, and files you create.
- **Usage data**: session information, IP addresses for security purposes.

## 2. How We Use Your Information
- To provide and maintain the service.
- To authenticate your identity.
- To store and serve your drawings and boards.

## 3. Data Storage
All data is stored on Cloudflare infrastructure (D1, R2). Your drawings are stored as encrypted JSON files.

## 4. Data Sharing
We do not sell, trade, or share your personal information with third parties.

## 5. Your Rights
- **Access**: Export all your data from your profile settings.
- **Deletion**: Delete your account and all associated data at any time.
- **Portability**: Export your drawings in standard Excalidraw format.

## 6. Cookies
We use essential session cookies for authentication. No tracking cookies are used.

## 7. Changes
We may update this policy from time to time. Changes will be reflected in the "Last updated" date.

## 8. Contact
For privacy concerns, contact the instance administrator.
`;

export const settingsRouter = router({
  // Public: check if any users exist (setup required if not)
  getSetupStatus: publicProcedure.query(async () => {
    const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
    return { isComplete: !!existingUser };
  }),

  // Public: is registration open?
  getRegistrationEnabled: publicProcedure.query(async () => {
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEYS.REGISTRATION_ENABLED))
      .limit(1);
    return { enabled: setting?.value === "true" };
  }),

  // Admin: toggle registration on/off
  updateRegistration: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .insert(appSettings)
        .values({
          key: SETTINGS_KEYS.REGISTRATION_ENABLED,
          value: input.enabled ? "true" : "false",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: input.enabled ? "true" : "false",
            updatedAt: new Date(),
          },
        });
      return { enabled: input.enabled };
    }),

  // Protected: delete own account and all associated data
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Delete all R2 scene files for user's boards
    const userBoards = await db
      .select({ sceneKey: board.sceneKey, thumbnailKey: board.thumbnailKey })
      .from(board)
      .where(eq(board.ownerId, userId));

    for (const b of userBoards) {
      await env.DRAWINGS_BUCKET.delete(b.sceneKey);
      if (b.thumbnailKey) {
        await env.DRAWINGS_BUCKET.delete(b.thumbnailKey);
      }
    }

    // Delete user — DB cascades handle sessions, accounts, boards, share links
    await db.delete(user).where(eq(user.id, userId));

    return { success: true };
  }),

  // Protected: export all personal data (GDPR right of access)
  exportMyData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [userData] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userBoards = await db
      .select({
        id: board.id,
        title: board.title,
        visibility: board.visibility,
        createdAt: board.createdAt,
        lastEditedAt: board.lastEditedAt,
      })
      .from(board)
      .where(eq(board.ownerId, userId));

    return { user: userData, boards: userBoards };
  }),

  // Avatar upload
  uploadAvatar: protectedProcedure
    .input(z.object({ data: z.string().max(3_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Delete old avatar if it exists
      const [existing] = await db
        .select({ image: user.image })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (existing?.image) {
        await env.DRAWINGS_BUCKET.delete(existing.image);
      }

      const key = `avatars/${userId}.png`;
      const buffer = Uint8Array.from(atob(input.data), (c) => c.charCodeAt(0));

      await env.DRAWINGS_BUCKET.put(key, buffer, {
        httpMetadata: { contentType: "image/png" },
      });

      await db.update(user).set({ image: key }).where(eq(user.id, userId));
      return { success: true };
    }),

  getAvatar: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [userData] = await db
        .select({ image: user.image })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!userData?.image) return null;

      const object = await env.DRAWINGS_BUCKET.get(userData.image);
      if (!object) return null;

      const arrayBuffer = await object.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return `data:image/png;base64,${btoa(binary)}`;
    }),

  // Legal pages (TOS / Privacy Policy)
  getLegalPage: publicProcedure
    .input(z.object({ page: z.enum(["tos", "privacy"]) }))
    .query(async ({ input }) => {
      const key = input.page === "tos" ? SETTINGS_KEYS.TOS_CONTENT : SETTINGS_KEYS.PRIVACY_CONTENT;
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .limit(1);

      return {
        content: setting?.value ?? (input.page === "tos" ? DEFAULT_TOS : DEFAULT_PRIVACY),
      };
    }),

  updateLegalPage: adminProcedure
    .input(z.object({
      page: z.enum(["tos", "privacy"]),
      content: z.string().max(100_000),
    }))
    .mutation(async ({ input }) => {
      const key = input.page === "tos" ? SETTINGS_KEYS.TOS_CONTENT : SETTINGS_KEYS.PRIVACY_CONTENT;
      await db
        .insert(appSettings)
        .values({ key, value: input.content, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: input.content, updatedAt: new Date() },
        });
      return { success: true };
    }),

  // Username
  updateUsername: protectedProcedure
    .input(z.object({
      username: z.string()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers, and hyphens only. Cannot start/end with a hyphen."),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, input.username))
        .limit(1);

      if (existing && existing.id !== ctx.session.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Username is already taken" });
      }

      await db
        .update(user)
        .set({ username: input.username })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  checkUsername: publicProcedure
    .input(z.object({ username: z.string().min(3).max(30) }))
    .query(async ({ input }) => {
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, input.username))
        .limit(1);

      return { available: !existing };
    }),
});
