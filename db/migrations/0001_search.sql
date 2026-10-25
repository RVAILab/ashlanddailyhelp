ALTER TABLE "listings" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(data->>'name', '')), 'A')
          || setweight(to_tsvector('english', coalesce(data->>'provider', '')), 'B')
          || setweight(to_tsvector('english', coalesce(data->>'description', '')), 'C')
          || setweight(jsonb_to_tsvector('english', coalesce(data->'tags', '[]'::jsonb), '["string"]'), 'C')) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX "listings_search" ON "listings" USING gin ("search");
