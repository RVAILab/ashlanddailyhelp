#!/bin/sh
# Copies the steward's feed contract and sample feed into this repo. Run after the steward changes either.
set -eu
cd "$(dirname "$0")/.."
steward=${1:-../daily-help-steward}
cp "$steward/src/contract/feed.ts" "$steward/src/contract/values.ts" contract/steward/
rm -rf test/fixtures/feed-sample && cp -R "$steward/fixtures/feed-sample" test/fixtures/feed-sample
echo "Copied the contract and sample feed from $steward ($(git -C "$steward" rev-parse --short HEAD))"
