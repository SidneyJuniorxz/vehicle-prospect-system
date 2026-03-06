CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(50),
	`entity_id` int,
	`details` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`source` enum('olx','mercado_livre','all') NOT NULL,
	`cron_expression` varchar(255),
	`is_active` boolean DEFAULT true,
	`config` json NOT NULL,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collection_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filter_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`config` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filter_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ad_id` int NOT NULL,
	`score` decimal(5,2) DEFAULT '0',
	`priority` enum('high','medium','low') DEFAULT 'low',
	`score_reason` text,
	`status` enum('new','filtered','reviewed','approved','rejected','in_progress','completed') DEFAULT 'new',
	`notes` text,
	`contacted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('new_lead','high_priority','collection_complete','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`lead_id` int,
	`is_read` boolean DEFAULT false,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ad_id` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scoring_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`rules` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scoring_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_ads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`source` enum('olx','mercado_livre','manual','api') NOT NULL,
	`url` text,
	`title` text NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`version` varchar(100),
	`year` int,
	`mileage` int,
	`price` decimal(12,2),
	`city` varchar(100),
	`state` varchar(2),
	`seller_type` enum('individual','dealer','reseller','unknown') DEFAULT 'unknown',
	`seller_name` varchar(255),
	`description` text,
	`photo_count` int DEFAULT 0,
	`photo_urls` json,
	`ad_posted_at` timestamp,
	`collected_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`is_active` boolean DEFAULT true,
	`hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','analyst','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
CREATE INDEX `log_user_id_idx` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `log_created_at_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `lead_ad_id_idx` ON `leads` (`ad_id`);--> statement-breakpoint
CREATE INDEX `lead_priority_idx` ON `leads` (`priority`);--> statement-breakpoint
CREATE INDEX `lead_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `external_id_idx` ON `vehicle_ads` (`external_id`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `vehicle_ads` (`source`);--> statement-breakpoint
CREATE INDEX `hash_idx` ON `vehicle_ads` (`hash`);--> statement-breakpoint
CREATE INDEX `collected_at_idx` ON `vehicle_ads` (`collected_at`);