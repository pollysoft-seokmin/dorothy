ALTER TABLE "playback_history" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'google_drive' NOT NULL;--> statement-breakpoint
ALTER TABLE "playback_history" ADD COLUMN IF NOT EXISTS "provider_file_id" text;--> statement-breakpoint
ALTER TABLE "playback_history" ADD COLUMN IF NOT EXISTS "provider_lrc_file_id" text;--> statement-breakpoint
ALTER TABLE "playback_history" ADD COLUMN IF NOT EXISTS "media_type" text;--> statement-breakpoint
ALTER TABLE "favorite" DROP CONSTRAINT IF EXISTS "favorite_media_asset_id_media_asset_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "favorite_user_asset_unique";--> statement-breakpoint
ALTER TABLE "favorite" DROP COLUMN IF EXISTS "media_asset_id";--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'google_drive' NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN IF NOT EXISTS "provider_file_id" text;--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN IF NOT EXISTS "provider_lrc_file_id" text;--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN IF NOT EXISTS "name" text;--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN IF NOT EXISTS "media_type" text;--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN IF NOT EXISTS "mime_type" text;--> statement-breakpoint
-- media_asset 제거로 provider_file_id 가 비게 된 기존(고아) 즐겨찾기 정리.
-- 이 행들은 가리킬 Drive 파일이 없어 재생/표시가 불가능하다.
DELETE FROM "favorite" WHERE "provider_file_id" IS NULL;--> statement-breakpoint
ALTER TABLE "favorite" ALTER COLUMN "provider_file_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "favorite_user_provider_file_unique" ON "favorite" USING btree ("user_id","source","provider_file_id");--> statement-breakpoint
DROP TABLE IF EXISTS "media_asset";--> statement-breakpoint
DROP TABLE IF EXISTS "folder";
