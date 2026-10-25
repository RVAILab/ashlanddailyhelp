CREATE TABLE "feed_files" (
	"name" text PRIMARY KEY NOT NULL,
	"etag" text,
	"schema_version" text,
	"generated_at" timestamp with time zone,
	"dataset" text,
	"stored_at" timestamp with time zone,
	"checked_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"ends_at" timestamp with time zone,
	"data" jsonb NOT NULL
);
