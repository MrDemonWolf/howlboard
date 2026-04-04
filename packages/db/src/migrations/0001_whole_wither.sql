PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`password` text,
	`scope` text,
	`id_token` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_account`("id", "user_id", "account_id", "provider_id", "access_token", "refresh_token", "access_token_expires_at", "password", "scope", "id_token", "created_at", "updated_at") SELECT "id", "user_id", "account_id", "provider_id", "access_token", "refresh_token", "access_token_expires_at", "password", "scope", "id_token", "created_at", "updated_at" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_app_settings`("key", "value", "updated_at") SELECT "key", "value", "updated_at" FROM `app_settings`;--> statement-breakpoint
DROP TABLE `app_settings`;--> statement-breakpoint
ALTER TABLE `__new_app_settings` RENAME TO `app_settings`;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "user_id", "expires_at", "token", "ip_address", "user_agent", "created_at", "updated_at") SELECT "id", "user_id", "expires_at", "token", "ip_address", "user_agent", "created_at", "updated_at" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "email", "name", "image", "role", "email_verified", "two_factor_enabled", "created_at", "updated_at") SELECT "id", "email", "name", "image", "role", "email_verified", "two_factor_enabled", "created_at", "updated_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `__new_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_verification`("id", "identifier", "value", "expires_at", "created_at", "updated_at") SELECT "id", "identifier", "value", "expires_at", "created_at", "updated_at" FROM `verification`;--> statement-breakpoint
DROP TABLE `verification`;--> statement-breakpoint
ALTER TABLE `__new_verification` RENAME TO `verification`;--> statement-breakpoint
CREATE TABLE `__new_board` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text DEFAULT 'Untitled' NOT NULL,
	`description` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`scene_key` text NOT NULL,
	`thumbnail_key` text,
	`collection_id` text,
	`last_edited_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_board`("id", "owner_id", "title", "description", "visibility", "scene_key", "thumbnail_key", "collection_id", "last_edited_at", "created_at", "updated_at") SELECT "id", "owner_id", "title", "description", "visibility", "scene_key", "thumbnail_key", "collection_id", "last_edited_at", "created_at", "updated_at" FROM `board`;--> statement-breakpoint
DROP TABLE `board`;--> statement-breakpoint
ALTER TABLE `__new_board` RENAME TO `board`;--> statement-breakpoint
CREATE INDEX `board_owner_idx` ON `board` (`owner_id`);--> statement-breakpoint
CREATE INDEX `board_visibility_idx` ON `board` (`visibility`);--> statement-breakpoint
CREATE INDEX `board_collection_idx` ON `board` (`collection_id`);--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_collection`("id", "owner_id", "name", "color", "sort_order", "created_at") SELECT "id", "owner_id", "name", "color", "sort_order", "created_at" FROM `collection`;--> statement-breakpoint
DROP TABLE `collection`;--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;--> statement-breakpoint
CREATE TABLE `__new_share_link` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`token` text NOT NULL,
	`permission` text DEFAULT 'view' NOT NULL,
	`expires_at` integer,
	`max_uses` integer,
	`use_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_share_link`("id", "board_id", "token", "permission", "expires_at", "max_uses", "use_count", "created_at") SELECT "id", "board_id", "token", "permission", "expires_at", "max_uses", "use_count", "created_at" FROM `share_link`;--> statement-breakpoint
DROP TABLE `share_link`;--> statement-breakpoint
ALTER TABLE `__new_share_link` RENAME TO `share_link`;--> statement-breakpoint
CREATE UNIQUE INDEX `share_link_token_unique` ON `share_link` (`token`);--> statement-breakpoint
CREATE INDEX `share_link_token_idx` ON `share_link` (`token`);--> statement-breakpoint
CREATE INDEX `share_link_board_idx` ON `share_link` (`board_id`);