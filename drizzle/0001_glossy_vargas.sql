CREATE TABLE `automation_check` (
	`id` integer PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`results` text
);
