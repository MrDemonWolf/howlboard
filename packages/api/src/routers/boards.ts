import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@howlboard/db";
import { board, shareLink } from "@howlboard/db/schema/boards";
import { env } from "@howlboard/env/server";
import {
  createBoardSchema,
  updateBoardSchema,
  createShareLinkSchema,
} from "@howlboard/shared";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

export const boardsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(board)
      .where(eq(board.ownerId, ctx.session.user.id))
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
        .set({ ...updates, updatedAt: new Date().toISOString() })
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

      // Delete scene from R2
      await env.DRAWINGS_BUCKET.delete(existing.sceneKey);
      if (existing.thumbnailKey) {
        await env.DRAWINGS_BUCKET.delete(existing.thumbnailKey);
      }

      await db.delete(board).where(eq(board.id, input.id));

      return { success: true };
    }),

  saveDrawing: protectedProcedure
    .input(z.object({ id: z.string(), data: z.string() }))
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
          lastEditedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(board.id, input.id));

      return { success: true };
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
          expiresAt: input.expiresAt,
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
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return null;
      }

      // Check max uses
      if (link.maxUses && link.useCount >= link.maxUses) {
        return null;
      }

      // Increment use count
      await db
        .update(shareLink)
        .set({ useCount: link.useCount + 1 })
        .where(eq(shareLink.id, link.id));

      // Get the board
      const [boardData] = await db
        .select()
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
        board: boardData,
        permission: link.permission,
        sceneData,
      };
    }),
});
