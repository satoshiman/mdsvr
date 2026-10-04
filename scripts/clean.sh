#!/bin/bash

set -e

cd "$(dirname "$0")/.."

echo "Cleaning build artifacts..."
rm -rf dist dist-test
rm -rf node_modules
rm -f package-lock.json
echo "Clean complete. Run 'npm install' to reinstall dependencies."
