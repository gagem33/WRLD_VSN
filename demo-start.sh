#!/bin/bash

# WRLD VSN Demo Mode - No API keys required
# Runs with mock data for testing

echo "=================================================="
echo "WRLD VSN - DEMO MODE"
echo "Running with mock data (no API keys required)"
echo "=================================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✅ Python 3 found"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install fastapi uvicorn websockets pydantic
cd ..

# Start backend in background
echo "🚀 Starting demo backend..."
cd backend
python3 demo.py &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 3

echo ""
echo "=================================================="
echo "✅ Demo backend is running!"
echo "=================================================="
echo ""
echo "Access:"
echo "  📡 API:       http://localhost:8000"
echo "  📊 API Docs:  http://localhost:8000/docs"
echo ""
echo "Test it:"
echo "  curl http://localhost:8000/api/v1/sentiment/global | python3 -m json.tool"
echo "  curl http://localhost:8000/api/v1/news/breaking | python3 -m json.tool"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID 2>/dev/null; exit" INT TERM

wait $BACKEND_PID
