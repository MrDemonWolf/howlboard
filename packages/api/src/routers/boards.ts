import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@howlboard/db";
import { board, shareLink } from "@howlboard/db/schema/boards";
import { env } from "@howlboard/env/server";
import {
  createBoardSchema,
  updateBoardSchema,
  createShareLinkSchema,
  LIMITS,
} from "@howlboard/shared";
import { eq, desc, sql, isNull, isNotNull, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

export const boardsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(board)
      .where(and(eq(board.ownerId, ctx.session.user.id), isNull(board.deletedAt)))
      .orderBy(desc(board.lastEditedAt));
  }),

  listTrashed: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(board)
      .where(and(eq(board.ownerId, ctx.session.user.id), isNotNull(board.deletedAt)))
      .orderBy(desc(board.lastEditedAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!result || result.ownerId !== ctx.session.user.id) {
        return null;
      }

      return result;
    }),

  create: protectedProcedure
    .input(createBoardSchema)
    .mutation(async ({ ctx, input }) => {
      const id = nanoid();
      const sceneKey = `scenes/${id}.json`;

      // Create empty Excalidraw scene in R2
      const emptyScene = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "howlboard",
        elements: [],
        appState: {},
        files: {},
      });

      await env.DRAWINGS_BUCKET.put(sceneKey, emptyScene, {
        httpMetadata: { contentType: "application/json" },
      });

      const [newBoard] = await db
        .insert(board)
        .values({
          id,
          ownerId: ctx.session.user.id,
          title: input.title,
          description: input.description,
          visibility: input.visibility,
          sceneKey,
          collectionId: input.collectionId,
        })
        .returning();

      return newBoard;
    }),

  update: protectedProcedure
    .input(updateBoardSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return null;
      }

      const [updated] = await db
        .update(board)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(board.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return { success: false };
      }

      // Soft delete — move to trash
      await db
        .update(board)
        .set({ deletedAt: new Date() })
        .where(eq(board.id, input.id));

      return { success: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return { success: false };
      }

      await db
        .update(board)
        .set({ deletedAt: null })
        .where(eq(board.id, input.id));

      return { success: true };
    }),

  permanentlyDelete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return { success: false };
      }

      if (!existing.deletedAt) {
        return { success: false };
      }

      // Delete scene from R2
      await env.DRAWINGS_BUCKET.delete(existing.sceneKey);
      if (existing.thumbnailKey) {
        await env.DRAWINGS_BUCKET.delete(existing.thumbnailKey);
      }

      await db.delete(board).where(eq(board.id, input.id));

      return { success: true };
    }),

  saveDrawing: protectedProcedure
    .input(z.object({ id: z.string(), data: z.string().max(LIMITS.MAX_SCENE_SIZE_BYTES) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return { success: false };
      }

      await env.DRAWINGS_BUCKET.put(existing.sceneKey, input.data, {
        httpMetadata: { contentType: "application/json" },
      });

      await db
        .update(board)
        .set({
          lastEditedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(board.id, input.id));

      return { success: true };
    }),

  saveThumbnail: protectedProcedure
    .input(z.object({ id: z.string(), data: z.string().max(500_000) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return { success: false };
      }

      const thumbnailKey = `thumbnails/${input.id}.png`;
      const buffer = Uint8Array.from(atob(input.data), (c) => c.charCodeAt(0));

      await env.DRAWINGS_BUCKET.put(thumbnailKey, buffer, {
        httpMetadata: { contentType: "image/png" },
      });

      await db
        .update(board)
        .set({ thumbnailKey })
        .where(eq(board.id, input.id));

      return { success: true };
    }),

  getThumbnail: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [existing] = await db
        .select({ thumbnailKey: board.thumbnailKey })
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing?.thumbnailKey) return null;

      const object = await env.DRAWINGS_BUCKET.get(existing.thumbnailKey);
      if (!object) return null;

      const arrayBuffer = await object.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return `data:image/png;base64,${btoa(binary)}`;
    }),

  loadDrawing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return null;
      }

      const object = await env.DRAWINGS_BUCKET.get(existing.sceneKey);
      if (!object) {
        return null;
      }

      return object.text();
    }),

  // Share link management
  createShareLink: protectedProcedure
    .input(createShareLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.boardId))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return null;
      }

      const id = nanoid();
      const token = nanoid(32);

      const [link] = await db
        .insert(shareLink)
        .values({
          id,
          boardId: input.boardId,
          token,
          permission: input.permission,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          maxUses: input.maxUses,
        })
        .returning();

      return link;
    }),

  getByShareToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const [link] = await db
        .select()
        .from(shareLink)
        .where(eq(shareLink.token, input.token))
        .limit(1);

      if (!link) {
        return null;
      }

      // Check expiration
      if (link.expiresAt && link.expiresAt < new Date()) {
        return null;
      }

      // Atomically increment use count only if under the limit
      const result = await db
        .update(shareLink)
        .set({ useCount: sql`use_count + 1` })
        .where(
          link.maxUses
            ? sql`${shareLink.id} = ${link.id} AND use_count < ${link.maxUses}`
            : eq(shareLink.id, link.id),
        )
        .returning({ useCount: shareLink.useCount });

      // If no rows updated, the max uses limit was hit concurrently
      if (link.maxUses && result.length === 0) {
        return null;
      }

      // Get the board — only expose safe fields
      const [boardData] = await db
        .select({
          id: board.id,
          title: board.title,
          visibility: board.visibility,
          sceneKey: board.sceneKey,
        })
        .from(board)
        .where(eq(board.id, link.boardId))
        .limit(1);

      if (!boardData) {
        return null;
      }

      // Load drawing
      const object = await env.DRAWINGS_BUCKET.get(boardData.sceneKey);
      const sceneData = object ? await object.text() : null;

      return {
        board: { id: boardData.id, title: boardData.title, visibility: boardData.visibility },
        permission: link.permission,
        sceneData,
      };
    }),

  // Library sync — store user's Excalidraw library items in R2
  saveLibrary: protectedProcedure
    .input(z.object({ data: z.string().max(5_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const key = `libraries/${ctx.session.user.id}.json`;
      await env.DRAWINGS_BUCKET.put(key, input.data, {
        httpMetadata: { contentType: "application/json" },
      });
      return { success: true };
    }),

  loadLibrary: protectedProcedure.query(async ({ ctx }) => {
    const key = `libraries/${ctx.session.user.id}.json`;
    const object = await env.DRAWINGS_BUCKET.get(key);
    if (!object) return null;
    return object.text();
  }),

  importScene: protectedProcedure
    .input(
      z.object({
        title: z.string().max(255).optional(),
        data: z.string().max(10 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = nanoid();
      const sceneKey = `scenes/${id}.json`;

      await env.DRAWINGS_BUCKET.put(sceneKey, input.data, {
        httpMetadata: { contentType: "application/json" },
      });

      const [newBoard] = await db
        .insert(board)
        .values({
          id,
          ownerId: ctx.session.user.id,
          title: input.title ?? "Imported scene",
          sceneKey,
        })
        .returning();

      return newBoard;
    }),
});
