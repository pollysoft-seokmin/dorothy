DROP INDEX "folder_user_parent_name_unique";--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_user_parent_name_unique" UNIQUE NULLS NOT DISTINCT("user_id","parent_id","name");