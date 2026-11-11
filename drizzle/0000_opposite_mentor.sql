CREATE TABLE `contact_rate` (
	`hour` integer NOT NULL,
	`bucket` text NOT NULL,
	`hits` integer NOT NULL,
	PRIMARY KEY(`hour`, `bucket`)
);
