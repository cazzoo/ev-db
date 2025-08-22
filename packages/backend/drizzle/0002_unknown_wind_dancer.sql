CREATE TABLE `custom_fields` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`field_type` text DEFAULT 'TEXT' NOT NULL,
	`validation_rules` text,
	`is_visible_on_card` integer DEFAULT false NOT NULL,
	`is_visible_on_details` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicle_custom_field_values` (
	`id` integer PRIMARY KEY NOT NULL,
	`vehicle_id` integer NOT NULL,
	`custom_field_id` integer NOT NULL,
	`value` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`custom_field_id`) REFERENCES `custom_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_fields_key_unique` ON `custom_fields` (`key`);--> statement-breakpoint
CREATE INDEX `custom_fields_key_idx` ON `custom_fields` (`key`);--> statement-breakpoint
CREATE INDEX `custom_fields_usage_count_idx` ON `custom_fields` (`usage_count`);--> statement-breakpoint
CREATE INDEX `custom_fields_name_idx` ON `custom_fields` (`name`);--> statement-breakpoint
CREATE INDEX `vehicle_custom_field_values_vehicle_field_idx` ON `vehicle_custom_field_values` (`vehicle_id`,`custom_field_id`);--> statement-breakpoint
CREATE INDEX `vehicle_custom_field_values_vehicle_idx` ON `vehicle_custom_field_values` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `vehicle_custom_field_values_field_idx` ON `vehicle_custom_field_values` (`custom_field_id`);--> statement-breakpoint
CREATE INDEX `vehicle_custom_field_values_unique_idx` ON `vehicle_custom_field_values` (`vehicle_id`,`custom_field_id`);