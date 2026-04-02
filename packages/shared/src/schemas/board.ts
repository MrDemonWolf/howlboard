import { z } from "zod";
import { LIMITS } from "../constants";

export const createBoardSchema = z.object({
  title: z.string().min(1).max(LIMITS.MAX_BOARD_TITLE_LENGTH).default("Untitled"),
  description: z.string().max(LIMITS.MAX_BOARD_DESCRIPTION_LENGTH).optional(),
  visibility: z.enum(["private", "public", "shared"]).default("private"),
  collectionId: z.string().optional(),
});

export const updateBoardSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(LIMITS.MAX_BOARD_TITLE_LENGTH).optional(),
  description: z.string().max(LIMITS.MAX_BOARD_DESCRIPTION_LENGTH).nullable().optional(),
  visibility: z.enum(["private", "public", "shared"]).optional(),
  collectionId: z.string().nullable().optional(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(LIMITS.MAX_COLLECTION_NAME_LENGTH),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateCollectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(LIMITS.MAX_COLLECTION_NAME_LENGTH).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createShareLinkSchema = z.object({
  boardId: z.string(),
  permission: z.enum(["view", "edit"]).default("view"),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
});
