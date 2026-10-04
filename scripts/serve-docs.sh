#!/bin/bash

set -e

cd "$(dirname "$0")/.."

PORT="${1:-3000}"
DOCS_DIR="${2:-./docs}"

echo "Serving docs from $DOCS_DIR on port $PORT..."
node bin/mdsvr.js --port "$PORT" "$DOCS_DIR"
