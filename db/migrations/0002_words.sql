ALTER TABLE "listings" ADD COLUMN "words" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(data->>'name', '')), 'A')
          || setweight(to_tsvector('simple', coalesce(data->>'provider', '')), 'B')
          || setweight(to_tsvector('simple', coalesce(data->>'description', '')), 'C')
          || setweight(jsonb_to_tsvector('simple', coalesce(data->'tags', '[]'::jsonb), '["string"]'), 'C')) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX "listings_words" ON "listings" USING gin ("words");
