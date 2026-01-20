from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum
import asyncio
import json

app = FastAPI(title="WRLD VSN API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class SentimentType(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"

class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class SentimentData(BaseModel):
    location: str
    coordinates: Coordinates
    sentiment_score: float  # -1 to 1
    intensity: int  # 0 to 100
    source_count: int
    timestamp: datetime

class NewsEvent(BaseModel):
    id: str
    title: str
    summary: str
    coordinates: Coordinates
    sentiment: SentimentType
    urgency: UrgencyLevel
    source: str
    credibility_score: float
    tags: List[str]
    timestamp: datetime
    related_assets: Optional[List[str]] = []

class MarketData(BaseModel):
    symbol: str
    price: float
    change_percent: float
    volume: int
    market_cap: Optional[float]
    headquarters: Optional[Coordinates]
    timestamp: datetime

class SocialPost(BaseModel):
    id: str
    platform: str
    content: str
    author: str
    sentiment_score: float
    engagement: int
    coordinates: Optional[Coordinates]
    timestamp: datetime

class LocationData(BaseModel):
    location_name: str
    coordinates: Coordinates
    news: List[NewsEvent]
    sentiment: SentimentData
    markets: List[MarketData]
    social: List[SocialPost]
    macro_data: Optional[Dict] = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Endpoints
@app.get("/")
async def root():
    return {
        "name": "WRLD VSN API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/api/v1/sentiment/global")
async def get_global_sentiment() -> List[SentimentData]:
    """Get global sentiment heatmap data"""
    # Mock data - replace with real data pipeline
    return [
        SentimentData(
            location="New York",
            coordinates=Coordinates(latitude=40.7128, longitude=-74.0060),
            sentiment_score=0.65,
            intensity=85,
            source_count=1247,
            timestamp=datetime.now()
        ),
        SentimentData(
            location="London",
            coordinates=Coordinates(latitude=51.5074, longitude=-0.1278),
            sentiment_score=0.32,
            intensity=72,
            source_count=892,
            timestamp=datetime.now()
        ),
        SentimentData(
            location="Tokyo",
            coordinates=Coordinates(latitude=35.6762, longitude=139.6503),
            sentiment_score=-0.15,
            intensity=68,
            source_count=1056,
            timestamp=datetime.now()
        )
    ]

@app.get("/api/v1/news/breaking")
async def get_breaking_news(limit: int = 50) -> List[NewsEvent]:
    """Get breaking news events with geolocation"""
    # Mock data - integrate with news APIs
    return [
        NewsEvent(
            id="news_001",
            title="Federal Reserve signals potential rate adjustment",
            summary="Fed officials indicate flexibility in monetary policy amid economic data",
            coordinates=Coordinates(latitude=38.8951, longitude=-77.0364),
            sentiment=SentimentType.BULLISH,
            urgency=UrgencyLevel.HIGH,
            source="Reuters",
            credibility_score=0.95,
            tags=["monetary-policy", "fed", "rates"],
            timestamp=datetime.now(),
            related_assets=["SPY", "TLT", "GLD"]
        )
    ]

@app.get("/api/v1/location/{lat}/{lng}")
async def get_location_data(lat: float, lng: float, radius: int = 50) -> LocationData:
    """Get comprehensive data for a specific location"""
    # This would aggregate data from multiple sources
    return LocationData(
        location_name="New York City",
        coordinates=Coordinates(latitude=lat, longitude=lng),
        news=[],
        sentiment=SentimentData(
            location="New York",
            coordinates=Coordinates(latitude=lat, longitude=lng),
            sentiment_score=0.5,
            intensity=75,
            source_count=500,
            timestamp=datetime.now()
        ),
        markets=[],
        social=[],
        macro_data={
            "inflation": 3.2,
            "unemployment": 3.8,
            "gdp_growth": 2.1
        }
    )

@app.get("/api/v1/markets/by-location")
async def get_markets_by_location(lat: float, lng: float) -> List[MarketData]:
    """Get market data for companies headquartered near coordinates"""
    # Query database for companies by HQ location
    return []

@app.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Simulate real-time data push
            await asyncio.sleep(5)
            update = {
                "type": "sentiment_update",
                "data": {
                    "location": "New York",
                    "sentiment_score": 0.65,
                    "timestamp": datetime.now().isoformat()
                }
            }
            await websocket.send_json(update)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/v1/alerts/subscribe")
async def subscribe_to_alerts(
    locations: List[str],
    keywords: List[str],
    sentiment_threshold: float
):
    """Subscribe to custom alerts"""
    return {"status": "subscribed", "alert_id": "alert_123"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
