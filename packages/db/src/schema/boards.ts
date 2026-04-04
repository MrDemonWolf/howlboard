import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

// ─── Collections (folders) ───────────────────────────────
export const collection = sqliteTable(
  "collection",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    ownerIdx: index("collection_owner_idx").on(table.ownerId),
  }),
);

// ─── Boards ──────────────────────────────────────────────
export const board = sqliteTable(
  "board",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    description: text("description"),
    visibility: text("visibility", {
      enum: ["private", "public", "shared"],
    })
      .notNull()
      .default("private"),
    sceneKey: text("scene_key").notNull(),
    thumbnailKey: text("thumbnail_key"),
    collectionId: text("collection_id").references(() => collection.id, {
      onDelete: "set null",
    }),
    lastEditedAt: integer("last_edited_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    ownerIdx: index("board_owner_idx").on(table.ownerId),
    visibilityIdx: index("board_visibility_idx").on(table.visibility),
    collectionIdx: index("board_collection_idx").on(table.collectionId),
  }),
);

// ─── Share Links ─────────────────────────────────────────
export const shareLink = sqliteTable(
  "share_link",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    permission: text("permission", {
      enum: ["view", "edit"],
    })
      .notNull()
      .default("view"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    tokenIdx: index("share_link_token_idx").on(table.token),
    boardIdx: index("share_link_board_idx").on(table.boardId),
  }),
);
