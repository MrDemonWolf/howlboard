import type { BoardVisibility, SharePermission, UserRole } from "../constants";

export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  visibility: BoardVisibility;
  sceneKey: string;
  thumbnailKey: string | null;
  collectionId: string | null;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ShareLink = {
  id: string;
  boardId: string;
  token: string;
  permission: SharePermission;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
};

export type Collection = {
  id: string;
  ownerId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  createdAt: string;
};
