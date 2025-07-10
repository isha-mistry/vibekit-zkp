#!/bin/bash

echo "Testing Docker build with WASM files..."

# Build the Docker image
echo "Building Docker image..."
docker build -t vibekit-web-test .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    
    # Test if files are present in the built image
    echo "Checking if WASM files are present in the image..."
    docker run --rm vibekit-web-test ls -la public/*.wasm public/*.zkey
    
    if [ $? -eq 0 ]; then
        echo "✅ WASM files found in Docker image!"
    else
        echo "❌ WASM files NOT found in Docker image!"
    fi
else
    echo "❌ Docker build failed!"
    exit 1
fi 