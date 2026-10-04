#!/bin/bash

set -e

cd "$(dirname "$0")/.."

echo "Building mdsvr..."
npm run build
echo "Build complete."
