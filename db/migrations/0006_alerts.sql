CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
