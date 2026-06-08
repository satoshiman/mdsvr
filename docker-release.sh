#!/bin/bash

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="thedeployer/mdsvr"

echo "Building Docker image for version $VERSION..."

# Build with version tag
docker build -t "$IMAGE_NAME:$VERSION" .

# Also tag as latest
docker tag "$IMAGE_NAME:$VERSION" "$IMAGE_NAME:latest"

echo "Pushing $IMAGE_NAME:$VERSION..."
docker push "$IMAGE_NAME:$VERSION"

echo "Pushing $IMAGE_NAME:latest..."
docker push "$IMAGE_NAME:latest"

echo "✓ Released $IMAGE_NAME:$VERSION and $IMAGE_NAME:latest"
