CREATE TABLE "translations" (
	"hash" text PRIMARY KEY NOT NULL,
	"lang" text NOT NULL,
	"english" text NOT NULL,
	"text" text NOT NULL,
	"model" text NOT NULL,
	"translated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "search_es" "tsvector";--> statement-breakpoint
CREATE INDEX "listings_search_es" ON "listings" USING gin ("search_es");
