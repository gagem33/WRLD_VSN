"""
Demo Backend - Runs without external APIs using mock data
Perfect for testing and development
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import random
import asyncio
import uvicorn

app = FastAPI(title="WRLD VSN Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data
CITIES = [
    {"name": "New York", "lat": 40.7128, "lng": -74.0060},
    {"name": "London", "lat": 51.5074, "lng": -0.1278},
    {"name": "Tokyo", "lat": 35.6762, "lng": 139.6503},
    {"name": "Hong Kong", "lat": 22.3193, "lng": 114.1694},
    {"name": "Singapore", "lat": 1.3521, "lng": 103.8198},
    {"name": "Paris", "lat": 48.8566, "lng": 2.3522},
    {"name": "Frankfurt", "lat": 50.1109, "lng": 8.6821},
    {"name": "Shanghai", "lat": 31.2304, "lng": 121.4737},
    {"name": "Sydney", "lat": -33.8688, "lng": 151.2093},
    {"name": "Toronto", "lat": 43.6532, "lng": -79.3832},
]

NEWS_TEMPLATES = [
    "{city} central bank maintains interest rates amid inflation concerns",
    "Tech stocks rally in {city} as earnings beat expectations",
    "{city} markets react to new economic stimulus package",
    "Energy sector sees volatility in {city} trading session",
    "Financial services boom in {city} attracts global investment",
]

def generate_mock_sentiment():
    """Generate mock sentiment data"""
    return [
        {
            "location": city["name"],
            "coordinates": {"latitude": city["lat"], "longitude": city["lng"]},
            "sentiment_score": random.uniform(-0.8, 0.8),
            "intensity": random.randint(40, 100),
            "source_count": random.randint(100, 2000),
            "timestamp": datetime.now().isoformat()
        }
        for city in CITIES
    ]

def generate_mock_news():
    """Generate mock news events"""
    news = []
    for city in random.sample(CITIES, k=5):
        template = random.choice(NEWS_TEMPLATES)
        sentiment_score = random.uniform(-0.8, 0.8)
        
        news.append({
            "id": f"news_{random.randint(1000, 9999)}",
            "title": template.format(city=city["name"]),
            "summary": f"Latest developments in {city['name']}'s financial markets.",
            "coordinates": {"latitude": city["lat"], "longitude": city["lng"]},
            "sentiment": "bullish" if sentiment_score > 0.2 else "bearish" if sentiment_score < -0.2 else "neutral",
            "urgency": random.choice(["low", "medium", "high"]),
            "source": random.choice(["Reuters", "Bloomberg", "Financial Times", "WSJ"]),
            "credibility_score": random.uniform(0.7, 0.98),
            "tags": ["markets", "finance", city["name"].lower()],
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(0, 240))).isoformat()
        })
    
    return news

@app.get("/")
def root():
    return {
        "name": "WRLD VSN Demo API",
        "mode": "mock_data",
        "status": "operational"
    }

@app.get("/api/v1/sentiment/global")
def get_global_sentiment():
    return generate_mock_sentiment()

@app.get("/api/v1/news/breaking")
def get_breaking_news(limit: int = 50):
    return generate_mock_news()

@app.get("/api/v1/location/{lat}/{lng}")
def get_location_data(lat: float, lng: float):
    # Find nearest city
    nearest_city = min(
        CITIES,
        key=lambda c: abs(c["lat"] - lat) + abs(c["lng"] - lng)
    )
    
    sentiment_score = random.uniform(-0.6, 0.6)
    
    return {
        "location_name": nearest_city["name"],
        "coordinates": {"latitude": lat, "longitude": lng},
        "news": generate_mock_news()[:3],
        "sentiment": {
            "location": nearest_city["name"],
            "coordinates": {"latitude": lat, "longitude": lng},
            "sentiment_score": sentiment_score,
            "intensity": random.randint(50, 90),
            "source_count": random.randint(200, 800),
            "timestamp": datetime.now().isoformat()
        },
        "markets": [],
        "social": [],
        "macro_data": {
            "inflation": round(random.uniform(2.0, 4.5), 1),
            "unemployment": round(random.uniform(3.0, 6.0), 1),
            "gdp_growth": round(random.uniform(1.5, 3.5), 1)
        }
    }

@app.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(5)
            
            # Send random update
            city = random.choice(CITIES)
            update = {
                "type": "sentiment_update",
                "data": {
                    "location": city["name"],
                    "coordinates": city,
                    "sentiment_score": random.uniform(-0.8, 0.8),
                    "timestamp": datetime.now().isoformat()
                }
            }
            await websocket.send_json(update)
    except:
        pass

if __name__ == "__main__":
    print("=" * 60)
    print("WRLD VSN - Demo Mode")
    print("Running with MOCK DATA - no API keys required")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
