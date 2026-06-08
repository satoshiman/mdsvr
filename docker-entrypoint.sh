#!/bin/sh

# Check if /app/docs exists (user mounted their docs)
if [ -d "/app/docs" ]; then
  echo "Serving /app/docs"
  exec node bin/mdsvr.js --host 0.0.0.0 /app/docs
else
  echo "No /app/docs found, falling back to /app/default-docs"
  exec node bin/mdsvr.js --host 0.0.0.0 /app/default-docs
fi
