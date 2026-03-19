CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "collection_jobs" ALTER COLUMN "source" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "collection_jobs" ALTER COLUMN "source" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_jobs" ADD COLUMN "status" "job_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_jobs" ADD COLUMN "progress" jsonb DEFAULT '{"processed":0,"total":0,"currentStep":"","lastMessage":""}'::jsonb;--> statement-breakpoint
ALTER TABLE "collection_jobs" ADD COLUMN "error" text;