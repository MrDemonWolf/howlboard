import { router, protectedProcedure } from "../index";
import { db } from "@howlboard/db";
import { collection } from "@howlboard/db/schema/boards";
import { board } from "@howlboard/db/schema/boards";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@howlboard/shared";
import { eq, asc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

export const collectionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const collections = await db
      .select({
        id: collection.id,
        ownerId: collection.ownerId,
        name: collection.name,
        color: collection.color,
        sortOrder: collection.sortOrder,
        createdAt: collection.createdAt,
        boardCount: sql<number>`(
          SELECT COUNT(*) FROM board
          WHERE board.collection_id = ${collection.id}
        )`.as("board_count"),
      })
      .from(collection)
      .where(eq(collection.ownerId, ctx.session.user.id))
      .orderBy(asc(collection.sortOrder));

    return collections;
  }),

  create: protectedProcedure
    .input(createCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      const id = nanoid();

      const [newCollection] = await db
        .insert(collection)
        .values({
          id,
          ownerId: ctx.session.user.id,
          name: input.name,
          color: input.color,
        })
        .returning();

      return newCollection;
    }),

  update: protectedProcedure
    .input(updateCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [existing] = await db
        .select()
        .from(collection)
        .where(eq(collection.id, id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return null;
      }

      const [updated] = await db
        .update(collection)
        .set(updates)
        .where(eq(collection.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(collection)
        .where(eq(collection.id, input.id))
        .limit(1);

      if (!existing || existing.ownerId !== ctx.session.user.id) {
        return { success: false };
      }

      // Unlink boards from this collection
      await db
        .update(board)
        .set({ collectionId: null })
        .where(eq(board.collectionId, input.id));

      await db.delete(collection).where(eq(collection.id, input.id));

      return { success: true };
    }),

  assignBoard: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        collectionId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify board ownership
      const [existingBoard] = await db
        .select()
        .from(board)
        .where(eq(board.id, input.boardId))
        .limit(1);

      if (!existingBoard || existingBoard.ownerId !== ctx.session.user.id) {
        return null;
      }

      // Verify collection ownership (if assigning to a collection)
      if (input.collectionId) {
        const [existingCollection] = await db
          .select()
          .from(collection)
          .where(eq(collection.id, input.collectionId))
          .limit(1);

        if (
          !existingCollection ||
          existingCollection.ownerId !== ctx.session.user.id
        ) {
          return null;
        }
      }

      const [updated] = await db
        .update(board)
        .set({
          collectionId: input.collectionId,
          updatedAt: new Date(),
        })
        .where(eq(board.id, input.boardId))
        .returning();

      return updated;
    }),
});
