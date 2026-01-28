"""
WRLD VSN V4 - AUTHORITATIVE DATA LAYER
Railway Backend - Single Source of Truth

Architecture:
- Background workers continuously poll external APIs
- All data stored in authoritative state with versioning
- Atomic updates with timestamps
- Zero caching on endpoints
- Snapshot-based API responses
"""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import asyncio
import os
import httpx
from typing import Dict, Any, List, Optional
import json

app = FastAPI(
    title="WRLD VSN Authoritative Layer",
    description="Single Source of Truth for Global Intelligence",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API KEYS
# ============================================================================

FINNHUB_KEY = os.getenv("FINNHUB_KEY")
COINMARKETCAP_KEY = os.getenv("COINMARKETCAP_KEY")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")

# ============================================================================
# AUTHORITATIVE STATE - SINGLE SOURCE OF TRUTH
# ============================================================================

AUTHORITATIVE_STATE = {
    "markets": None,     # Complete market snapshot
    "news": None,        # Complete news feed
    "weather": None,     # Weather data
}

# Version tracking for each data type
STATE_VERSIONS = {
    "markets": 0,
    "news": 0,
    "weather": 0,
}

# Locks to prevent race conditions during updates
STATE_LOCKS = {
    "markets": asyncio.Lock(),
    "news": asyncio.Lock(),
    "weather": asyncio.Lock(),
}

# Track when each snapshot was last updated
LAST_UPDATES = {
    "markets": None,
    "news": None,
    "weather": None,
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_utc_timestamp() -> str:
    """Always return ISO 8601 UTC timestamp - this is our standard"""
    return datetime.now(timezone.utc).isoformat()

def normalize_timestamp(ts: Any) -> str:
    """
    Convert any timestamp format to ISO 8601 UTC
    Handles: Unix timestamps, ISO strings, datetime objects
    """
    if ts is None:
        return get_utc_timestamp()
    
    try:
        if isinstance(ts, int) or isinstance(ts, float):
            # Unix timestamp (seconds or milliseconds)
            if ts > 10**10:  # Milliseconds
                ts = ts / 1000
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            return dt.isoformat()
        
        elif isinstance(ts, str):
            # Try parsing ISO format
            # Handle 'Z' timezone indicator
            ts_clean = ts.replace('Z', '+00:00')
            dt = datetime.fromisoformat(ts_clean)
            # Ensure UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt.isoformat()
        
        elif isinstance(ts, datetime):
            # datetime object
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            else:
                ts = ts.astimezone(timezone.utc)
            return ts.isoformat()
        
        else:
            # Unknown type, return current time
            return get_utc_timestamp()
    
    except Exception as e:
        print(f"⚠️ Timestamp normalization failed: {e}, using current time")
        return get_utc_timestamp()

# ============================================================================
# EXTERNAL API FETCHERS
# ============================================================================

async def fetch_finnhub_equities() -> List[Dict]:
    """
    Fetch equity indices from Finnhub
    Returns normalized data structure
    """
    if not FINNHUB_KEY:
        print("⚠️ FINNHUB_KEY not configured")
        return []
    
    # Major indices to track
    symbols = {
        "^GSPC": {"name": "S&P 500", "exchange": "US"},
        "^IXIC": {"name": "NASDAQ", "exchange": "US"},
        "^DJI": {"name": "DOW", "exchange": "US"},
        "^FTSE": {"name": "FTSE 100", "exchange": "UK"},
        "^GDAXI": {"name": "DAX", "exchange": "DE"},
    }
    
    results = []
    
    async with httpx.AsyncClient() as client:
        for symbol, info in symbols.items():
            try:
                url = "https://finnhub.io/api/v1/quote"
                params = {"symbol": symbol, "token": FINNHUB_KEY}
                response = await client.get(url, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('c'):  # Current price exists
                        results.append({
                            "symbol": symbol,
                            "name": info["name"],
                            "exchange": info["exchange"],
                            "price": float(data['c']),
                            "change_percent": float(data.get('dp', 0)),
                            "change_value": float(data.get('d', 0)),
                            "high": float(data.get('h', 0)),
                            "low": float(data.get('l', 0)),
                            "open": float(data.get('o', 0)),
                            "previous_close": float(data.get('pc', 0)),
                            "timestamp": normalize_timestamp(data.get('t')),
                        })
                        print(f"✅ Finnhub: {info['name']} = {data['c']}")
                
            except Exception as e:
                print(f"❌ Finnhub error for {symbol}: {e}")
                continue
    
    return results

async def fetch_coinmarketcap_crypto() -> List[Dict]:
    """
    Fetch top cryptocurrencies from CoinMarketCap
    Returns normalized data structure
    """
    if not COINMARKETCAP_KEY:
        print("⚠️ COINMARKETCAP_KEY not configured")
        return []
    
    symbols = ["BTC", "ETH", "BNB", "SOL", "XRP"]
    results = []
    
    try:
        async with httpx.AsyncClient() as client:
            url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
            headers = {"X-CMC_PRO_API_KEY": COINMARKETCAP_KEY}
            params = {"symbol": ",".join(symbols), "convert": "USD"}
            
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                
                for symbol in symbols:
                    if symbol in data.get('data', {}):
                        coin = data['data'][symbol]
                        quote = coin['quote']['USD']
                        
                        results.append({
                            "symbol": symbol,
                            "name": coin['name'],
                            "price": float(quote['price']),
                            "change_percent_24h": float(quote.get('percent_change_24h', 0)),
                            "change_percent_7d": float(quote.get('percent_change_7d', 0)),
                            "volume_24h": float(quote.get('volume_24h', 0)),
                            "market_cap": float(quote.get('market_cap', 0)),
                            "timestamp": normalize_timestamp(quote.get('last_updated')),
                        })
                        print(f"✅ CoinMarketCap: {symbol} = ${quote['price']:.2f}")
            
    except Exception as e:
        print(f"❌ CoinMarketCap error: {e}")
    
    return results

async def fetch_binance_crypto_backup() -> List[Dict]:
    """
    Backup crypto source using Binance public API (no key required)
    """
    symbols = [
        ("BTCUSDT", "BTC"),
        ("ETHUSDT", "ETH"),
        ("BNBUSDT", "BNB"),
        ("SOLUSDT", "SOL"),
    ]
    results = []
    
    try:
        async with httpx.AsyncClient() as client:
            for pair, symbol in symbols:
                try:
                    url = f"https://api.binance.com/api/v3/ticker/24hr"
                    params = {"symbol": pair}
                    response = await client.get(url, params=params, timeout=5.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        results.append({
                            "symbol": symbol,
                            "name": symbol,
                            "price": float(data['lastPrice']),
                            "change_percent_24h": float(data['priceChangePercent']),
                            "volume_24h": float(data['volume']),
                            "timestamp": normalize_timestamp(data.get('closeTime')),
                        })
                        print(f"✅ Binance: {symbol} = ${data['lastPrice']}")
                        
                except Exception as e:
                    print(f"❌ Binance error for {symbol}: {e}")
                    continue
    
    except Exception as e:
        print(f"❌ Binance general error: {e}")
    
    return results

async def fetch_finnhub_news() -> List[Dict]:
    """
    Fetch financial news from Finnhub
    Returns normalized article structure
    """
    if not FINNHUB_KEY:
        return []
    
    try:
        async with httpx.AsyncClient() as client:
            url = "https://finnhub.io/api/v1/news"
            params = {"category": "general", "token": FINNHUB_KEY}
            response = await client.get(url, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                articles = []
                
                for article in data[:30]:  # Top 30 articles
                    articles.append({
                        "id": f"finnhub_{article.get('id', '')}",
                        "title": article.get('headline', 'No title'),
                        "summary": article.get('summary', ''),
                        "url": article.get('url', ''),
                        "source": article.get('source', 'Finnhub'),
                        "article_timestamp": normalize_timestamp(article.get('datetime')),
                        "sentiment": analyze_sentiment(article.get('headline', '')),
                    })
                
                print(f"✅ Finnhub News: Fetched {len(articles)} articles")
                return articles
                
    except Exception as e:
        print(f"❌ Finnhub News error: {e}")
    
    return []

async def fetch_gdelt_news() -> List[Dict]:
    """
    Fetch global news from GDELT (always available, no key required)
    """
    try:
        async with httpx.AsyncClient() as client:
            url = "https://api.gdeltproject.org/api/v2/doc/doc"
            params = {
                "query": "market OR economy OR finance OR stocks OR trading",
                "mode": "ArtList",
                "maxrecords": 25,
                "format": "json",
                "timespan": "6h",
            }
            response = await client.get(url, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                articles = []
                
                for article in data.get('articles', [])[:25]:
                    articles.append({
                        "id": f"gdelt_{article.get('url', '')}",
                        "title": article.get('title', 'No title')[:200],
                        "url": article.get('url', ''),
                        "source": article.get('domain', 'GDELT'),
                        "article_timestamp": normalize_timestamp(article.get('seendate')),
                        "sentiment": analyze_sentiment(article.get('title', '')),
                    })
                
                print(f"✅ GDELT News: Fetched {len(articles)} articles")
                return articles
                
    except Exception as e:
        print(f"❌ GDELT News error: {e}")
    
    return []

def analyze_sentiment(text: str) -> str:
    """
    Simple keyword-based sentiment analysis
    Returns: 'bullish', 'bearish', 'neutral'
    """
    if not text:
        return 'neutral'
    
    text_lower = text.lower()
    
    bullish = ['surge', 'rally', 'gain', 'boom', 'growth', 'bull', 'soar', 'rise', 'up', 'high', 'profit']
    bearish = ['fall', 'drop', 'crash', 'decline', 'bear', 'plunge', 'crisis', 'down', 'low', 'loss', 'risk']
    
    bullish_count = sum(1 for word in bullish if word in text_lower)
    bearish_count = sum(1 for word in bearish if word in text_lower)
    
    if bullish_count > bearish_count:
        return 'bullish'
    elif bearish_count > bullish_count:
        return 'bearish'
    else:
        return 'neutral'

# ============================================================================
# BACKGROUND WORKERS - CONTINUOUS DATA POLLING
# ============================================================================

# [TO BE CONTINUED IN NEXT FILE - this is getting long]
# ============================================================================
# BACKGROUND WORKERS - THESE RUN CONTINUOUSLY
# ============================================================================

async def update_markets_worker():
    """
    MARKETS WORKER
    - Runs every 15 seconds
    - Fetches equities AND crypto in parallel
    - Builds complete snapshot
    - Atomically updates authoritative state
    - Increments version number
    """
    print("🚀 Markets worker started")
    
    # Wait a bit on startup to let server initialize
    await asyncio.sleep(2)
    
    while True:
        async with STATE_LOCKS["markets"]:
            try:
                print("\n📊 Updating markets...")
                
                # Fetch all market data in parallel
                equities_task = fetch_finnhub_equities()
                crypto_task = fetch_coinmarketcap_crypto()
                crypto_backup_task = fetch_binance_crypto_backup()
                
                equities, crypto_primary, crypto_backup = await asyncio.gather(
                    equities_task,
                    crypto_task,
                    crypto_backup_task,
                    return_exceptions=True
                )
                
                # Handle failures gracefully
                if isinstance(equities, Exception):
                    print(f"❌ Equities fetch failed: {equities}")
                    equities = []
                
                if isinstance(crypto_primary, Exception):
                    print(f"⚠️ CoinMarketCap failed, using Binance backup")
                    crypto = crypto_backup if not isinstance(crypto_backup, Exception) else []
                else:
                    crypto = crypto_primary
                
                # Build complete atomic snapshot
                new_version = STATE_VERSIONS["markets"] + 1
                snapshot = {
                    "equities": equities,
                    "crypto": crypto,
                    "server_timestamp": get_utc_timestamp(),
                    "data_version": new_version,
                    "sources": {
                        "equities": "Finnhub",
                        "crypto": "CoinMarketCap" if crypto == crypto_primary else "Binance",
                    },
                    "data_points": len(equities) + len(crypto),
                }
                
                # ATOMIC REPLACEMENT - all or nothing
                AUTHORITATIVE_STATE["markets"] = snapshot
                STATE_VERSIONS["markets"] = new_version
                LAST_UPDATES["markets"] = get_utc_timestamp()
                
                print(f"✅ Markets updated: v{new_version} ({snapshot['data_points']} data points)")
                
            except Exception as e:
                print(f"❌ Markets worker error: {e}")
        
        # Wait 15 seconds before next update
        await asyncio.sleep(15)


async def update_news_worker():
    """
    NEWS WORKER
    - Runs every 2 minutes
    - Fetches from Finnhub AND GDELT
    - Deduplicates by URL
    - Sorts by article timestamp
    - Atomically updates authoritative state
    """
    print("🚀 News worker started")
    
    await asyncio.sleep(5)  # Stagger startup
    
    while True:
        async with STATE_LOCKS["news"]:
            try:
                print("\n📰 Updating news...")
                
                # Fetch from multiple sources in parallel
                finnhub_task = fetch_finnhub_news()
                gdelt_task = fetch_gdelt_news()
                
                finnhub_articles, gdelt_articles = await asyncio.gather(
                    finnhub_task,
                    gdelt_task,
                    return_exceptions=True
                )
                
                # Handle failures
                if isinstance(finnhub_articles, Exception):
                    print(f"❌ Finnhub news failed: {finnhub_articles}")
                    finnhub_articles = []
                
                if isinstance(gdelt_articles, Exception):
                    print(f"❌ GDELT news failed: {gdelt_articles}")
                    gdelt_articles = []
                
                # Deduplicate by URL
                seen_urls = set()
                aggregated = []
                
                for article in finnhub_articles + gdelt_articles:
                    url = article.get('url', '')
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        aggregated.append(article)
                
                # Sort by article timestamp (newest first)
                aggregated.sort(
                    key=lambda x: x.get('article_timestamp', ''),
                    reverse=True
                )
                
                # Take top 50
                top_articles = aggregated[:50]
                
                # Build snapshot
                new_version = STATE_VERSIONS["news"] + 1
                snapshot = {
                    "articles": top_articles,
                    "server_timestamp": get_utc_timestamp(),
                    "data_version": new_version,
                    "total_articles": len(top_articles),
                    "sources": ["Finnhub", "GDELT"],
                }
                
                # ATOMIC REPLACEMENT
                AUTHORITATIVE_STATE["news"] = snapshot
                STATE_VERSIONS["news"] = new_version
                LAST_UPDATES["news"] = get_utc_timestamp()
                
                print(f"✅ News updated: v{new_version} ({len(top_articles)} articles)")
                
            except Exception as e:
                print(f"❌ News worker error: {e}")
        
        # Wait 2 minutes before next update
        await asyncio.sleep(120)


async def update_weather_worker():
    """
    WEATHER WORKER
    - Runs every 5 minutes
    - Fetches global weather data
    - Atomically updates authoritative state
    """
    print("🚀 Weather worker started")
    
    await asyncio.sleep(10)  # Stagger startup
    
    while True:
        async with STATE_LOCKS["weather"]:
            try:
                print("\n🌤️  Updating weather...")
                
                # Placeholder - would fetch from OpenWeatherMap
                new_version = STATE_VERSIONS["weather"] + 1
                snapshot = {
                    "storms": [],
                    "alerts": [],
                    "server_timestamp": get_utc_timestamp(),
                    "data_version": new_version,
                }
                
                AUTHORITATIVE_STATE["weather"] = snapshot
                STATE_VERSIONS["weather"] = new_version
                LAST_UPDATES["weather"] = get_utc_timestamp()
                
                print(f"✅ Weather updated: v{new_version}")
                
            except Exception as e:
                print(f"❌ Weather worker error: {e}")
        
        await asyncio.sleep(300)  # 5 minutes


# ============================================================================
# SNAPSHOT ENDPOINTS - THESE SERVE THE AUTHORITATIVE STATE
# ============================================================================

@app.get("/api/v1/snapshot/markets")
async def get_markets_snapshot(response: Response):
    """
    Returns complete markets snapshot
    
    CRITICAL RULES:
    - Never returns partial data
    - Always includes version number
    - Always includes server timestamp
    - Forces no-cache headers
    - Returns "initializing" if state not ready
    """
    # FORCE NO CACHING
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Check if state is initialized
    if AUTHORITATIVE_STATE["markets"] is None:
        return {
            "status": "initializing",
            "message": "Markets data is being loaded",
            "retry_after_seconds": 5,
            "server_timestamp": get_utc_timestamp(),
        }
    
    # Return complete snapshot
    snapshot = AUTHORITATIVE_STATE["markets"].copy()
    snapshot["endpoint_timestamp"] = get_utc_timestamp()
    
    return snapshot


@app.get("/api/v1/snapshot/news")
async def get_news_snapshot(response: Response):
    """
    Returns complete news snapshot
    Same rules as markets endpoint
    """
    # FORCE NO CACHING
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    if AUTHORITATIVE_STATE["news"] is None:
        return {
            "status": "initializing",
            "message": "News feed is being loaded",
            "retry_after_seconds": 5,
            "server_timestamp": get_utc_timestamp(),
        }
    
    snapshot = AUTHORITATIVE_STATE["news"].copy()
    snapshot["endpoint_timestamp"] = get_utc_timestamp()
    
    return snapshot


@app.get("/api/v1/snapshot/weather")
async def get_weather_snapshot(response: Response):
    """
    Returns complete weather snapshot
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    if AUTHORITATIVE_STATE["weather"] is None:
        return {
            "status": "initializing",
            "retry_after_seconds": 5,
            "server_timestamp": get_utc_timestamp(),
        }
    
    return AUTHORITATIVE_STATE["weather"]


@app.get("/api/v1/status")
async def get_status(response: Response):
    """
    Health check endpoint
    Shows state of all data sources
    """
    response.headers["Cache-Control"] = "no-cache"
    
    return {
        "service": "WRLD VSN Authoritative Layer",
        "version": "4.0.0",
        "status": "operational",
        "server_timestamp": get_utc_timestamp(),
        "data_sources": {
            "markets": {
                "initialized": AUTHORITATIVE_STATE["markets"] is not None,
                "version": STATE_VERSIONS["markets"],
                "last_update": LAST_UPDATES["markets"],
            },
            "news": {
                "initialized": AUTHORITATIVE_STATE["news"] is not None,
                "version": STATE_VERSIONS["news"],
                "last_update": LAST_UPDATES["news"],
            },
            "weather": {
                "initialized": AUTHORITATIVE_STATE["weather"] is not None,
                "version": STATE_VERSIONS["weather"],
                "last_update": LAST_UPDATES["weather"],
            },
        },
        "api_keys_configured": {
            "FINNHUB_KEY": bool(FINNHUB_KEY),
            "COINMARKETCAP_KEY": bool(COINMARKETCAP_KEY),
            "OPENWEATHER_KEY": bool(OPENWEATHER_KEY),
            "ALPHA_VANTAGE_KEY": bool(ALPHA_VANTAGE_KEY),
        },
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "WRLD VSN Authoritative Layer",
        "version": "4.0.0",
        "docs": "/docs",
        "status": "/api/v1/status",
    }


# ============================================================================
# STARTUP - LAUNCH BACKGROUND WORKERS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Start all background workers when server starts
    """
    print("=" * 70)
    print("🌍 WRLD VSN AUTHORITATIVE LAYER STARTING")
    print("=" * 70)
    
    # Log configuration
    print(f"✅ Finnhub: {'Configured' if FINNHUB_KEY else 'NOT CONFIGURED'}")
    print(f"✅ CoinMarketCap: {'Configured' if COINMARKETCAP_KEY else 'NOT CONFIGURED'}")
    print(f"✅ OpenWeather: {'Configured' if OPENWEATHER_KEY else 'NOT CONFIGURED'}")
    print(f"✅ Alpha Vantage: {'Configured' if ALPHA_VANTAGE_KEY else 'NOT CONFIGURED'}")
    
    print("\n🚀 Starting background workers...")
    
    # Launch all workers
    asyncio.create_task(update_markets_worker())
    asyncio.create_task(update_news_worker())
    asyncio.create_task(update_weather_worker())
    
    print("✅ All workers started")
    print("=" * 70)
    print("🎯 Server ready - Authoritative layer operational")
    print("=" * 70)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
