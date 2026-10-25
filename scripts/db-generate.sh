#!/bin/sh
# drizzle-kit writes migration files without a final newline; add one before they are committed or applied.
set -eu
cd "$(dirname "$0")/.."
npx drizzle-kit generate "$@"
for f in db/migrations/*.sql db/migrations/meta/*.json; do
  [ -z "$(tail -c1 "$f")" ] || echo >> "$f"
done
