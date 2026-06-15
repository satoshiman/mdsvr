#!/bin/sh

# Exit on any error
set -e

# Change to app directory
cd /app

# Check if node binary exists
if ! command -v node >/dev/null 2>&1; then
  echo "Error: node command not found"
  exit 1
fi

# Check if bin/mdsvr.js exists
if [ ! -f "bin/mdsvr.js" ]; then
  echo "Error: bin/mdsvr.js not found"
  exit 1
fi

# Check if /app/docs exists (user mounted their docs)
if [ -d "/app/docs" ]; then
  echo "Serving /app/docs"
  exec node bin/mdsvr.js --host 0.0.0.0 /app/docs
else
  echo "No /app/docs found, falling back to /app/default-docs"
  exec node bin/mdsvr.js --host 0.0.0.0 /app/default-docs
fi
