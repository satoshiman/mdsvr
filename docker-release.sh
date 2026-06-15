#!/bin/bash

# Exit on any error
set -e

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found"
  exit 1
fi

# Check if node command exists
if ! command -v node >/dev/null 2>&1; then
  echo "Error: node command not found"
  exit 1
fi

# Check if docker command exists
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker command not found"
  exit 1
fi

# Check if docker buildx is available
if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: docker buildx is not available. Please install docker buildx for multi-platform builds."
  exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ -z "$VERSION" ]; then
  echo "Error: Could not extract version from package.json"
  exit 1
fi

IMAGE_NAME="thedeployer/mdsvr"

echo "Building Docker image for version $VERSION (multi-platform)..."

# Build with version tag for multiple platforms
if ! docker buildx build --platform linux/amd64,linux/arm64 -t "$IMAGE_NAME:$VERSION" --push .; then
  echo "Error: Docker build failed"
  exit 1
fi

# Also tag as latest for multiple platforms
if ! docker buildx build --platform linux/amd64,linux/arm64 -t "$IMAGE_NAME:latest" --push .; then
  echo "Error: Docker build failed for latest tag"
  exit 1
fi

echo "Successfully released $IMAGE_NAME:$VERSION and $IMAGE_NAME:latest for linux/amd64 and linux/arm64 platforms"
