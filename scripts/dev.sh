#!/bin/bash

set -e

cd "$(dirname "$0")/.."

echo "Starting development watch mode..."
npm run dev
