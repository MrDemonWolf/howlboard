export const BOARD_VISIBILITY = {
  PRIVATE: "private",
  PUBLIC: "public",
  SHARED: "shared",
} as const;

export type BoardVisibility =
  (typeof BOARD_VISIBILITY)[keyof typeof BOARD_VISIBILITY];

export const SHARE_PERMISSION = {
  VIEW: "view",
  EDIT: "edit",
} as const;

export type SharePermission =
  (typeof SHARE_PERMISSION)[keyof typeof SHARE_PERMISSION];

export const USER_ROLE = {
  ADMIN: "admin",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const LIMITS = {
  MAX_BOARD_TITLE_LENGTH: 255,
  MAX_BOARD_DESCRIPTION_LENGTH: 1000,
  MAX_COLLECTION_NAME_LENGTH: 100,
  MAX_SCENE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
} as const;
