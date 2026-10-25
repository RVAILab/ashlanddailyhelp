CREATE TABLE "pulse_weeks" (
	"key" text PRIMARY KEY NOT NULL,
	"week_start" text NOT NULL,
	"revision" integer,
	"published_at" timestamp with time zone,
	"note" text,
	"dataset" text NOT NULL,
	"data" jsonb NOT NULL
);
