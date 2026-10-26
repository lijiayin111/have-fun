CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`community` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communities_code_unique` ON `communities` (`code`);--> statement-breakpoint
CREATE TABLE `documents` (
	`owner` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_links` (
	`elder` text NOT NULL,
	`family` text NOT NULL,
	`granted` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`elder`, `family`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`target` text,
	`expires` integer NOT NULL,
	`used` text
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`scope` text NOT NULL,
	`mime` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`community` text NOT NULL,
	`user` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`community`, `user`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`community` text,
	`body` text NOT NULL,
	`reply` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`activity` text NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`activity`, `user`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`community` text NOT NULL,
	`payload` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` integer NOT NULL
);
