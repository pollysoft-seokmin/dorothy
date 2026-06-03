CREATE TABLE "favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_asset_id" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_media_asset_id_media_asset_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorite_user_position_idx" ON "favorite" USING btree ("user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_user_asset_unique" ON "favorite" USING btree ("user_id","media_asset_id");