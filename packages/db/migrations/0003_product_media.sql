CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"url" text NOT NULL,
	"public_id" text NOT NULL,
	"alt" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"format" text NOT NULL,
	"duration_seconds" numeric,
	"poster_public_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_media_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "product_media_primary_is_image" CHECK ("product_media"."is_primary" = false OR "product_media"."kind" = 'image'),
	CONSTRAINT "product_media_video_max_60s" CHECK ("product_media"."kind" = 'image' OR ("product_media"."duration_seconds" IS NOT NULL AND "product_media"."duration_seconds" <= 60))
);
--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_one_primary_key" ON "product_media" USING btree ("product_id") WHERE "product_media"."is_primary";--> statement-breakpoint
CREATE INDEX "product_media_product_sort_idx" ON "product_media" USING btree ("product_id","sort_order");