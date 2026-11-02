CREATE TYPE "public"."product_availability" AS ENUM('in_stock', 'low_stock', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."product_pieces" AS ENUM('two_piece', 'three_piece');--> statement-breakpoint
CREATE TYPE "public"."product_season" AS ENUM('winter', 'summer', 'all_season');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"design_code" text,
	"import_key" text,
	"description" text,
	"price" integer,
	"compare_at_price" integer,
	"currency" char(3) DEFAULT 'PKR' NOT NULL,
	"category_id" text NOT NULL,
	"pieces" "product_pieces" NOT NULL,
	"piece_details" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collection_type" text,
	"dress_categories" text[] DEFAULT '{}' NOT NULL,
	"fabric" text NOT NULL,
	"design" text[] DEFAULT '{}' NOT NULL,
	"season" "product_season",
	"outfit_style" text,
	"main_color" text,
	"color_family" text,
	"accent_colors" text[] DEFAULT '{}' NOT NULL,
	"motifs" text[] DEFAULT '{}' NOT NULL,
	"related_design_codes" text[] DEFAULT '{}' NOT NULL,
	"care_instructions" text,
	"availability" "product_availability" DEFAULT 'in_stock' NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("product"."name", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("product"."fabric", '') || ' ' ||
                  coalesce("product"."design_code", '') || ' ' ||
                  coalesce("product"."main_color", '') || ' ' ||
                  coalesce("product"."color_family", '') || ' ' ||
                  immutable_array_to_string("product"."accent_colors", ' ') || ' ' ||
                  immutable_array_to_string("product"."design", ' ')), 'B') ||
        setweight(to_tsvector('simple', coalesce("product"."description", '') || ' ' ||
                  immutable_array_to_string("product"."motifs", ' ')), 'C')) STORED,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_price_not_negative" CHECK ("product"."price" >= 0),
	CONSTRAINT "product_published_has_price" CHECK ("product"."status" <> 'published' OR "product"."price" IS NOT NULL),
	CONSTRAINT "product_compare_at_above_price" CHECK ("product"."compare_at_price" IS NULL OR ("product"."price" IS NOT NULL AND "product"."compare_at_price" > "product"."price"))
);
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_design_code_key" ON "product" USING btree ("design_code") WHERE "product"."design_code" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_import_key_key" ON "product" USING btree ("import_key") WHERE "product"."import_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "product_category_id_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_status_category_published_idx" ON "product" USING btree ("status","category_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "product_status_featured_idx" ON "product" USING btree ("status","featured");--> statement-breakpoint
CREATE INDEX "product_status_price_idx" ON "product" USING btree ("status","price");--> statement-breakpoint
CREATE INDEX "product_status_pieces_idx" ON "product" USING btree ("status","pieces");--> statement-breakpoint
CREATE INDEX "product_status_fabric_idx" ON "product" USING btree ("status","fabric");--> statement-breakpoint
CREATE INDEX "product_status_season_idx" ON "product" USING btree ("status","season");--> statement-breakpoint
CREATE INDEX "product_status_outfit_style_idx" ON "product" USING btree ("status","outfit_style");--> statement-breakpoint
CREATE INDEX "product_status_color_family_idx" ON "product" USING btree ("status","color_family");--> statement-breakpoint
CREATE INDEX "product_search_vector_idx" ON "product" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "product_name_trgm_idx" ON "product" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "product_design_idx" ON "product" USING gin ("design");--> statement-breakpoint
CREATE INDEX "product_dress_categories_idx" ON "product" USING gin ("dress_categories");