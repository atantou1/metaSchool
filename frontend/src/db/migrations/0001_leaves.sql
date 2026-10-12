ALTER TABLE `teachers` ADD COLUMN `afm` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `adt` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `am` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `phone` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `email` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `address` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `city` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `postal_code` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `father_name` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `mother_name` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `birth_year` text;
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `employment_type` text DEFAULT 'permanent';
--> statement-breakpoint
ALTER TABLE `teachers` ADD COLUMN `signature` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leaves` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days_count` integer NOT NULL,
	`protocol_number` text,
	`protocol_date` text,
	`reason` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`documents_data` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade
);
