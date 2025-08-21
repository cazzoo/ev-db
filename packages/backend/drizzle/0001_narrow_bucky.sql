ALTER TABLE vehicles ADD `created_at` integer NOT NULL;--> statement-breakpoint
CREATE INDEX `vehicles_created_at_idx` ON `vehicles` (`created_at`);--> statement-breakpoint
CREATE INDEX `vehicles_make_model_idx` ON `vehicles` (`make`,`model`);