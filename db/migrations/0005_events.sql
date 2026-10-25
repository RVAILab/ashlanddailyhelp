CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"lasts_until" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
