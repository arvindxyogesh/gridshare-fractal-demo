#!/bin/bash
echo "🚀 Starting GridShare Fractal Demo..."
echo "📦 Building and starting Docker containers..."

# Stop any existing containers
docker-compose down

# Build and start new containers
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 15

echo "✅ Services should be starting up..."
echo "🌐 Open your browser and go to: http://localhost:5000"
echo "📊 Check status with: docker-compose ps"
echo "📋 View logs with: docker-compose logs -f"
