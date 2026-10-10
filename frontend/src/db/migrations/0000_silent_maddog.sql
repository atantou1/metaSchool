CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`short_name` text,
	`students_count` integer DEFAULT 20 NOT NULL,
	`head_teacher_id` text,
	`room` text,
	`is_all_day` integer DEFAULT false NOT NULL,
	`support_specialties` text,
	`students` text,
	`weekly_hours_target` integer DEFAULT 30 NOT NULL,
	`support_hours_min` integer DEFAULT 0 NOT NULL,
	`support_hours_max` integer DEFAULT 0 NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`sub_group_id` text NOT NULL,
	`hours` integer NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`concurrent_group_id` text,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sub_group_id`) REFERENCES `sub_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`enforcement` text DEFAULT 'hard' NOT NULL,
	`weight` integer DEFAULT 100,
	`params` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`slots_data` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sub_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`students` text,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`code` text NOT NULL,
	`color` text DEFAULT '#71717a' NOT NULL,
	`allowed_specialties` text,
	`default_specialty` text,
	`class_hours` text,
	`class_teachers` text,
	`class_assignments` text,
	`max_per_day` integer
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`specialty` text NOT NULL,
	`is_support` integer DEFAULT false NOT NULL,
	`short_name` text,
	`is_teaching` integer DEFAULT true NOT NULL,
	`is_on_call` integer DEFAULT false NOT NULL,
	`is_morning` integer DEFAULT true NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`max_weekly_hours` integer DEFAULT 24 NOT NULL,
	`color` text DEFAULT '#71717a' NOT NULL,
	`constraints` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timetable_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`period` integer NOT NULL,
	`assignment_id` text,
	`class_id` text NOT NULL,
	`sub_group_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`is_support` integer DEFAULT false NOT NULL,
	`layer` integer DEFAULT 1 NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`students` text,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sub_group_id`) REFERENCES `sub_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
