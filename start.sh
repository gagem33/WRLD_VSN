#!/bin/bash

# WRLD VSN Quick Start Script
# This script helps you get the platform running quickly

set -e

echo "=================================================="
echo "WRLD VSN - Quick Start Setup"
echo "=================================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo ""
    echo "⚠️  IMPORTANT: You need to add your API keys to the .env file"
    echo ""
    echo "Required (for basic functionality):"
    echo "  - MAPBOX_TOKEN (get from https://mapbox.com)"
    echo ""
    echo "Optional (for full features):"
    echo "  - NEWSAPI_KEY (get from https://newsapi.org)"
    echo "  - OPENCAGE_API_KEY (get from https://opencagedata.com)"
    echo "  - POLYGON_API_KEY (get from https://polygon.io)"
    echo ""
    read -p "Press Enter to edit .env file now, or Ctrl+C to exit and edit manually..."
    ${EDITOR:-nano} .env
fi

echo ""
echo "🚀 Starting WRLD VSN platform..."
echo ""

# Pull images
echo "📦 Pulling Docker images..."
docker-compose pull

# Build custom images
echo "🔨 Building application images..."
docker-compose build

# Start services
echo "▶️  Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "=================================================="
    echo "✅ WRLD VSN is running!"
    echo "=================================================="
    echo ""
    echo "Access the platform:"
    echo "  🌐 Frontend:  http://localhost:3000"
    echo "  📡 API:       http://localhost:8000"
    echo "  📊 API Docs:  http://localhost:8000/docs"
    echo "  📈 Grafana:   http://localhost:3001 (admin/admin)"
    echo ""
    echo "Useful commands:"
    echo "  View logs:        docker-compose logs -f"
    echo "  Stop platform:    docker-compose stop"
    echo "  Restart:          docker-compose restart"
    echo "  Full shutdown:    docker-compose down"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Check the API documentation at http://localhost:8000/docs"
    echo "  3. Monitor logs with: docker-compose logs -f"
    echo ""
else
    echo ""
    echo "❌ Some services failed to start. Check logs with:"
    echo "   docker-compose logs"
    echo ""
    exit 1
fi
