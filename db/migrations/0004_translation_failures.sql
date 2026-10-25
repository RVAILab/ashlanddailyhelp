CREATE TABLE "translation_failures" (
	"hash" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"failed_at" timestamp with time zone NOT NULL
);
