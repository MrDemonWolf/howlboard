import { router, protectedProcedure } from "../index";
import { db } from "@howlboard/db";
import { collection } from "@howlboard/db/schema/boards";
import { board } from "@howlboard/db/schema/boards";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@howlboard/shared";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

export const collectionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(collection)
      .where(eq(collection.ownerId, ctx.session.user.id))
      .orderBy(asc(collection.sortOrder));
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
});
