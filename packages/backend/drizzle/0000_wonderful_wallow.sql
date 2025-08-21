CREATE TABLE `admin_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`data_type` text DEFAULT 'STRING' NOT NULL,
	`description` text,
	`is_encrypted` integer DEFAULT false NOT NULL,
	`validation_rules` text,
	`default_value` text,
	`is_active` integer DEFAULT true NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` integer NOT NULL,
	`updated_by` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `admin_settings_audit` (
	`id` integer PRIMARY KEY NOT NULL,
	`setting_id` integer NOT NULL,
	`old_value` text,
	`new_value` text,
	`action` text NOT NULL,
	`changed_by` integer NOT NULL,
	`changed_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`setting_id`) REFERENCES `admin_settings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `changelog_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`changelog_id` integer NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`changelog_id`) REFERENCES `changelogs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `changelogs` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`release_date` integer NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`notification_sent` integer DEFAULT false NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contribution_reviews` (
	`id` integer PRIMARY KEY NOT NULL,
	`contribution_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`vote` integer NOT NULL,
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`vehicle_data` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`change_type` text DEFAULT 'NEW' NOT NULL,
	`target_vehicle_id` integer,
	`created_at` integer NOT NULL,
	`approved_at` integer,
	`rejected_at` integer,
	`cancelled_at` integer,
	`rejection_comment` text,
	`rejected_by` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rejected_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `image_contributions` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`vehicle_id` integer NOT NULL,
	`contribution_id` integer,
	`filename` text NOT NULL,
	`original_filename` text NOT NULL,
	`path` text NOT NULL,
	`alt_text` text,
	`caption` text,
	`file_size` integer,
	`mime_type` text,
	`width` integer,
	`height` integer,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`submitted_at` integer NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` integer,
	`rejection_reason` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `in_app_notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`event_type` text NOT NULL,
	`notification_type` text DEFAULT 'info' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`category` text DEFAULT 'system' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` integer,
	`action_url` text,
	`metadata` text,
	`expires_at` integer,
	`created_by` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `moderation_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`target_type` text DEFAULT 'CONTRIBUTION' NOT NULL,
	`target_id` integer NOT NULL,
	`action` text NOT NULL,
	`moderator_id` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`moderator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_analytics` (
	`id` integer PRIMARY KEY NOT NULL,
	`notification_id` integer,
	`scheduled_notification_id` integer,
	`user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`action` text NOT NULL,
	`action_url` text,
	`user_agent` text,
	`ip_address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `in_app_notifications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scheduled_notification_id`) REFERENCES `scheduled_notifications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`queue_id` integer,
	`user_id` integer,
	`channel` text NOT NULL,
	`event_type` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text,
	`status` text NOT NULL,
	`sent_at` integer,
	`response_data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`queue_id`) REFERENCES `notification_queue`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_queue` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer,
	`channel` text NOT NULL,
	`event_type` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text,
	`content` text NOT NULL,
	`metadata` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`scheduled_at` integer NOT NULL,
	`sent_at` integer,
	`failed_at` integer,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`notification_type` text DEFAULT 'info' NOT NULL,
	`category` text DEFAULT 'system' NOT NULL,
	`variables` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rss_feed_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`event_type` text NOT NULL,
	`link` text NOT NULL,
	`guid` text NOT NULL,
	`pub_date` integer NOT NULL,
	`author` text,
	`category` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scheduled_notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`notification_type` text DEFAULT 'info' NOT NULL,
	`target_audience` text DEFAULT 'all_users' NOT NULL,
	`target_roles` text,
	`target_user_ids` text,
	`scheduled_at` integer NOT NULL,
	`expires_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_notification_preferences` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`channel` text NOT NULL,
	`event_type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`app_currency_balance` integer DEFAULT 0 NOT NULL,
	`avatar_url` text,
	`theme` text DEFAULT 'light'
);
--> statement-breakpoint
CREATE TABLE `vehicle_images` (
	`id` integer PRIMARY KEY NOT NULL,
	`vehicle_id` integer NOT NULL,
	`filename` text NOT NULL,
	`path` text NOT NULL,
	`url` text NOT NULL,
	`alt_text` text,
	`caption` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`file_size` integer,
	`mime_type` text,
	`width` integer,
	`height` integer,
	`uploaded_by` integer,
	`uploaded_at` integer NOT NULL,
	`is_approved` integer DEFAULT false NOT NULL,
	`approved_by` integer,
	`approved_at` integer,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`year` integer NOT NULL,
	`battery_capacity` integer,
	`range` integer,
	`charging_speed` integer,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `webhook_configurations` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`method` text DEFAULT 'POST' NOT NULL,
	`content_type` text DEFAULT 'application/json' NOT NULL,
	`auth_type` text DEFAULT 'none',
	`auth_token` text,
	`auth_username` text,
	`auth_password` text,
	`auth_header_name` text,
	`secret` text,
	`timeout` integer DEFAULT 30 NOT NULL,
	`retry_attempts` integer DEFAULT 3 NOT NULL,
	`retry_delay` integer DEFAULT 5 NOT NULL,
	`enabled_events` text DEFAULT '[]' NOT NULL,
	`event_filters` text,
	`custom_headers` text,
	`payload_template` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`last_triggered` integer,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`created_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `changelogs_version_unique` ON `changelogs` (`version`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_user_id_idx` ON `in_app_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_is_read_idx` ON `in_app_notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_created_at_idx` ON `in_app_notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_event_type_idx` ON `in_app_notifications` (`event_type`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_user_read_idx` ON `in_app_notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_expires_at_idx` ON `in_app_notifications` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `rss_feed_items_guid_unique` ON `rss_feed_items` (`guid`);--> statement-breakpoint
CREATE INDEX `scheduled_notifications_status_idx` ON `scheduled_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `scheduled_notifications_scheduled_at_idx` ON `scheduled_notifications` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `scheduled_notifications_status_scheduled_idx` ON `scheduled_notifications` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `scheduled_notifications_created_by_idx` ON `scheduled_notifications` (`created_by`);--> statement-breakpoint
CREATE INDEX `user_notification_preferences_user_id_idx` ON `user_notification_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_notification_preferences_user_channel_event_idx` ON `user_notification_preferences` (`user_id`,`channel`,`event_type`);--> statement-breakpoint
CREATE INDEX `user_notification_preferences_enabled_idx` ON `user_notification_preferences` (`enabled`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);