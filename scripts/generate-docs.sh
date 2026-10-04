#!/bin/bash

set -e

cd "$(dirname "$0")/.."

SOURCE="${1:-./docs}"
OUTPUT="${2:-./gh-pages/docs}"

echo "Generating static docs from $SOURCE to $OUTPUT..."
npm run start -- "$SOURCE" -e "$OUTPUT"
echo "Static docs generated at $OUTPUT."
