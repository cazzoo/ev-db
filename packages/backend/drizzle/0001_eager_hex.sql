CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL,
	`name` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` integer PRIMARY KEY NOT NULL,
	`api_key_id` integer,
	`user_id` integer,
	`used_at` integer NOT NULL,
	`path` text NOT NULL,
	`method` text NOT NULL,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE contributions ADD `change_type` text DEFAULT 'NEW' NOT NULL;--> statement-breakpoint
ALTER TABLE contributions ADD `target_vehicle_id` integer REFERENCES vehicles(id);--> statement-breakpoint
ALTER TABLE contributions ADD `cancelled_at` integer;--> statement-breakpoint
ALTER TABLE users ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE users ADD `theme` text DEFAULT 'light';--> statement-breakpoint
ALTER TABLE vehicles ADD `description` text;--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/