CREATE TABLE `contact_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`payload_hash` text NOT NULL,
	`hour` integer NOT NULL,
	`client_bucket` text NOT NULL,
	`phone_bucket` text NOT NULL,
	`accepted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_submission_client_hour` ON `contact_submission` (`hour`,`client_bucket`);--> statement-breakpoint
CREATE INDEX `contact_submission_phone_hour` ON `contact_submission` (`hour`,`phone_bucket`);