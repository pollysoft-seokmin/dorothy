ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "view_mode" text DEFAULT 'default' NOT NULL;
