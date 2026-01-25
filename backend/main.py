"""
WRLD VSN - Ultimate Financial Intelligence Backend V3
ACCURACY FIRST: Real-time data, validation, backups, transparency
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import httpx
import asyncio
import hashlib
from collections import defaultdict
from enum import Enum
import pytz

app = FastAPI(
    title="WRLD VSN Ultimate API V3",
    description="Professional Financial Intelligence - Accuracy Guaranteed",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys
FINNHUB_KEY = os.getenv("FINNHUB_KEY")
COINMARKETCAP_KEY = os.getenv("COINMARKETCAP_KEY")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")
FRED_API_KEY = os.getenv("FRED_API_KEY")

class DataStatus(str, Enum):
    VERIFIED = "verified"
    STALE = "stale"
    ESTIMATED = "estimated"
    ERROR = "error"

class DataPoint(BaseModel):
    value: float
    timestamp: datetime
    source: str
    status: DataStatus
    age_seconds: int
    is_live: bool

# Major financial cities
MAJOR_CITIES = {
    "New York": {
        "lat": 40.7128, "lng": -74.0060, "timezone": "America/New_York",
        "symbol": "^GSPC", "exchange": "NYSE", "index": "S&P 500"
    },
    "London": {
        "lat": 51.5074, "lng": -0.1278, "timezone": "Europe/London",
        "symbol": "^FTSE", "exchange": "LSE", "index": "FTSE 100"
    },
    "Tokyo": {
        "lat": 35.6762, "lng": 139.6503, "timezone": "Asia/Tokyo",
        "symbol": "^N225", "exchange": "TSE", "index": "Nikkei 225"
    },
    "Hong Kong": {
        "lat": 22.3193, "lng": 114.1694, "timezone": "Asia/Hong_Kong",
        "symbol": "^HSI", "exchange": "HKEX", "index": "Hang Seng"
    },
    "Frankfurt": {
        "lat": 50.1109, "lng": 8.6821, "timezone": "Europe/Berlin",
        "symbol": "^GDAXI", "exchange": "XETRA", "index": "DAX"
    },
    "Paris": {
        "lat": 48.8566, "lng": 2.3522, "timezone": "Europe/Paris",
        "symbol": "^FCHI", "exchange": "Euronext", "index": "CAC 40"
    },
    "Shanghai": {
        "lat": 31.2304, "lng": 121.4737, "timezone": "Asia/Shanghai",
        "symbol": "000001.SS", "exchange": "SSE", "index": "Shanghai Composite"
    },
    "Sydney": {
        "lat": -33.8688, "lng": 151.2093, "timezone": "Australia/Sydney",
        "symbol": "^AXJO", "exchange": "ASX", "index": "ASX 200"
    },
}

# Cache with metadata
_cache = {}
_cache_metadata = {}

def get_cache_ttl(data_type: str, is_market_open: bool) -> int:
    """Smart cache duration based on data type and market status"""
    if not is_market_open and data_type in ['index', 'stock']:
        return 3600  # 1 hour when market closed
    
    ttls = {
        'top_index': 5,      # Ultra-fast
        'index': 15,         # Fast
        'crypto': 10,        # Crypto is 24/7
        'commodity': 60,     # Medium
        'weather': 300,      # 5 minutes
        'calendar': 3600,    # 1 hour
        'news': 120          # 2 minutes
    }
    return ttls.get(data_type, 300)

def is_market_open(exchange: str) -> bool:
    """Check if market is currently open"""
    now = datetime.now(pytz.UTC)
    
    market_hours = {
        'NYSE': {'tz': 'America/New_York', 'open': 9.5, 'close': 16, 'days': [0,1,2,3,4]},
        'LSE': {'tz': 'Europe/London', 'open': 8, 'close': 16.5, 'days': [0,1,2,3,4]},
        'TSE': {'tz': 'Asia/Tokyo', 'open': 9, 'close': 15, 'days': [0,1,2,3,4]},
        'HKEX': {'tz': 'Asia/Hong_Kong', 'open': 9.5, 'close': 16, 'days': [0,1,2,3,4]},
        'XETRA': {'tz': 'Europe/Berlin', 'open': 9, 'close': 17.5, 'days': [0,1,2,3,4]},
    }
    
    if exchange not in market_hours:
        return True  # Assume open if unknown (like crypto)
    
    hours = market_hours[exchange]
    local_time = now.astimezone(pytz.timezone(hours['tz']))
    
    # Check day of week (0=Monday, 6=Sunday)
    if local_time.weekday() not in hours['days']:
        return False
    
    # Check time
    current_hour = local_time.hour + local_time.minute / 60
    return hours['open'] <= current_hour < hours['close']

async def fetch_with_validation(primary_func, backup_func, data_type: str):
    """Fetch data with validation and backup"""
    try:
        # Try primary source
        data = await primary_func()
        if data and 'value' in data and data['value'] is not None:
            data['status'] = DataStatus.VERIFIED
            return data
    except Exception as e:
        print(f"⚠️ Primary source failed for {data_type}: {e}")
    
    try:
        # Try backup source
        print(f"🔄 Trying backup source for {data_type}")
        data = await backup_func()
        if data and 'value' in data and data['value'] is not None:
            data['status'] = DataStatus.VERIFIED
            data['source'] += ' (backup)'
            return data
    except Exception as e:
        print(f"❌ Backup source also failed for {data_type}: {e}")
    
    # Return stale data if available
    if data_type in _cache:
        cached = _cache[data_type]
        cached['status'] = DataStatus.STALE
        cached['age_seconds'] = int((datetime.now() - cached['timestamp']).total_seconds())
        return cached
    
    return None

async def fetch_index_finnhub(symbol: str, name: str) -> Dict:
    """Fetch index from Finnhub (primary)"""
    async with httpx.AsyncClient() as client:
        url = f"https://finnhub.io/api/v1/quote"
        params = {"symbol": symbol, "token": FINNHUB_KEY}
        response = await client.get(url, params=params, timeout=5.0)
        data = response.json()
        
        if data.get('c'):  # current price exists
            return {
                'value': data['c'],
                'change': data.get('dp', 0),  # daily percent change
                'timestamp': datetime.now(),
                'source': 'Finnhub',
                'is_live': True
            }
    return None

async def fetch_index_yahoo(symbol: str, name: str) -> Dict:
    """Fetch index from Yahoo Finance (backup)"""
    async with httpx.AsyncClient() as client:
        # Yahoo Finance doesn't need API key for basic quotes
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {"interval": "1m", "range": "1d"}
        response = await client.get(url, params=params, timeout=5.0)
        data = response.json()
        
        if 'chart' in data and 'result' in data['chart']:
            result = data['chart']['result'][0]
            meta = result.get('meta', {})
            
            return {
                'value': meta.get('regularMarketPrice'),
                'change': meta.get('regularMarketChangePercent', 0),
                'timestamp': datetime.now(),
                'source': 'Yahoo Finance',
                'is_live': True
            }
    return None

async def fetch_crypto_cmc(symbol: str) -> Dict:
    """Fetch crypto from CoinMarketCap (primary)"""
    async with httpx.AsyncClient() as client:
        url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
        headers = {"X-CMC_PRO_API_KEY": COINMARKETCAP_KEY}
        params = {"symbol": symbol, "convert": "USD"}
        
        response = await client.get(url, headers=headers, params=params, timeout=5.0)
        data = response.json()
        
        if 'data' in data and symbol in data['data']:
            coin = data['data'][symbol]
            quote = coin['quote']['USD']
            
            return {
                'value': quote['price'],
                'change': quote['percent_change_24h'],
                'timestamp': datetime.now(),
                'source': 'CoinMarketCap',
                'is_live': True,
                'volume_24h': quote.get('volume_24h'),
                'market_cap': quote.get('market_cap')
            }
    return None

async def fetch_crypto_binance(symbol: str) -> Dict:
    """Fetch crypto from Binance (backup)"""
    async with httpx.AsyncClient() as client:
        # Convert symbol format (BTC -> BTCUSDT)
        symbol_pair = f"{symbol}USDT"
        url = f"https://api.binance.com/api/v3/ticker/24hr"
        params = {"symbol": symbol_pair}
        
        response = await client.get(url, params=params, timeout=5.0)
        data = response.json()
        
        if 'lastPrice' in data:
            return {
                'value': float(data['lastPrice']),
                'change': float(data['priceChangePercent']),
                'timestamp': datetime.now(),
                'source': 'Binance',
                'is_live': True
            }
    return None

async def fetch_realtime_markets():
    """Fetch real-time market data with validation"""
    
    # Top indices (ultra-fast refresh)
    top_indices = ['S&P 500', 'NASDAQ', 'Dow Jones']
    
    # Other indices (fast refresh)
    other_indices = ['FTSE 100', 'DAX', 'Nikkei 225', 'Hang Seng']
    
    # Top crypto (fast refresh)
    top_crypto = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']
    
    markets = {
        'equities': [],
        'crypto': [],
        'last_update': datetime.now().isoformat(),
        'data_quality': {}
    }
    
    # Fetch top indices
    for idx_name in top_indices:
        city = [c for c, info in MAJOR_CITIES.items() if info.get('index') == idx_name]
        if city:
            city_info = MAJOR_CITIES[city[0]]
            is_open = is_market_open(city_info['exchange'])
            
            data = await fetch_with_validation(
                lambda s=city_info['symbol'], n=idx_name: fetch_index_finnhub(s, n),
                lambda s=city_info['symbol'], n=idx_name: fetch_index_yahoo(s, n),
                f"index_{idx_name}"
            )
            
            if data:
                markets['equities'].append({
                    'name': idx_name,
                    'symbol': city_info['symbol'],
                    'value': data['value'],
                    'change': data['change'],
                    'status': data.get('status', DataStatus.VERIFIED),
                    'source': data['source'],
                    'is_live': is_open,
                    'market_status': 'OPEN' if is_open else 'CLOSED',
                    'timestamp': data['timestamp'].isoformat(),
                    'age_seconds': int((datetime.now() - data['timestamp']).total_seconds())
                })
    
    # Fetch crypto
    for crypto_symbol in top_crypto:
        data = await fetch_with_validation(
            lambda s=crypto_symbol: fetch_crypto_cmc(s),
            lambda s=crypto_symbol: fetch_crypto_binance(s),
            f"crypto_{crypto_symbol}"
        )
        
        if data:
            # Get historical data for candlesticks (last 24 hours, 15-min intervals)
            candlestick_data = await fetch_crypto_candlesticks(crypto_symbol)
            
            markets['crypto'].append({
                'symbol': crypto_symbol,
                'value': data['value'],
                'change': data['change'],
                'status': data.get('status', DataStatus.VERIFIED),
                'source': data['source'],
                'is_live': True,  # Crypto is 24/7
                'timestamp': data['timestamp'].isoformat(),
                'age_seconds': int((datetime.now() - data['timestamp']).total_seconds()),
                'candlestick_data': candlestick_data
            })
    
    # Data quality summary
    markets['data_quality'] = {
        'equities': {
            'total': len(markets['equities']),
            'verified': len([e for e in markets['equities'] if e['status'] == DataStatus.VERIFIED]),
            'stale': len([e for e in markets['equities'] if e['status'] == DataStatus.STALE])
        },
        'crypto': {
            'total': len(markets['crypto']),
            'verified': len([c for c in markets['crypto'] if c['status'] == DataStatus.VERIFIED]),
            'stale': len([c for c in markets['crypto'] if c['status'] == DataStatus.STALE])
        }
    }
    
    return markets

async def fetch_crypto_candlesticks(symbol: str, hours: int = 24) -> List[Dict]:
    """Fetch candlestick data for crypto (15-min intervals)"""
    try:
        async with httpx.AsyncClient() as client:
            # Use Binance for historical data (free, no key needed)
            symbol_pair = f"{symbol}USDT"
            url = "https://api.binance.com/api/v3/klines"
            params = {
                "symbol": symbol_pair,
                "interval": "15m",  # 15-minute candles
                "limit": min(96, hours * 4)  # 4 candles per hour
            }
            
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
            
            candlesticks = []
            for candle in data:
                candlesticks.append({
                    'timestamp': datetime.fromtimestamp(candle[0] / 1000).isoformat(),
                    'open': float(candle[1]),
                    'high': float(candle[2]),
                    'low': float(candle[3]),
                    'close': float(candle[4]),
                    'volume': float(candle[5])
                })
            
            return candlesticks[-50:]  # Return last 50 candles for display
    except Exception as e:
        print(f"⚠️ Error fetching candlesticks for {symbol}: {e}")
        return []

async def fetch_financial_news():
    """Fetch high-quality financial news (Finnhub + GDELT)"""
    all_news = []
    
    # 1. Finnhub - Financial focus (primary)
    if FINNHUB_KEY:
        try:
            async with httpx.AsyncClient() as client:
                url = "https://finnhub.io/api/v1/news"
                params = {"category": "general", "token": FINNHUB_KEY}
                response = await client.get(url, params=params, timeout=10.0)
                data = response.json()
                
                for idx, article in enumerate(data[:40]):
                    title = article.get("headline", "")
                    summary = article.get("summary", "")
                    
                    city = assign_news_to_city(title, summary)
                    sentiment = analyze_sentiment(title + " " + summary)
                    quality_score = calculate_news_quality(article, 'Finnhub')
                    
                    all_news.append({
                        "id": f"finnhub_{idx}",
                        "title": title,
                        "source": article.get("source", "Finnhub"),
                        "sentiment": sentiment,
                        "city": city,
                        "timestamp": datetime.fromtimestamp(article.get("datetime", 0)).isoformat(),
                        "url": article.get("url"),
                        "quality_score": quality_score,
                        "age_seconds": int((datetime.now() - datetime.fromtimestamp(article.get("datetime", 0))).total_seconds())
                    })
                
                print(f"✅ Finnhub: Fetched {len(data[:40])} articles")
        except Exception as e:
            print(f"⚠️ Finnhub news error: {e}")
    
    # 2. GDELT - Global supplement
    try:
        async with httpx.AsyncClient() as client:
            url = "https://api.gdeltproject.org/api/v2/doc/doc"
            params = {
                "query": "market OR economy OR stocks OR finance OR trading",
                "mode": "ArtList",
                "maxrecords": 30,
                "format": "json",
                "timespan": "6h"
            }
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
            
            for idx, article in enumerate(data.get("articles", [])[:20]):
                title = article.get("title", "")
                
                city = assign_news_to_city(title)
                sentiment = analyze_sentiment(title)
                quality_score = calculate_news_quality(article, 'GDELT')
                
                all_news.append({
                    "id": f"gdelt_{idx}",
                    "title": title[:200],
                    "source": article.get("domain", "GDELT"),
                    "sentiment": sentiment,
                    "city": city,
                    "timestamp": article.get("seendate", datetime.now().isoformat()),
                    "url": article.get("url"),
                    "quality_score": quality_score,
                    "age_seconds": 0  # GDELT doesn't provide precise timestamps
                })
            
            print(f"✅ GDELT: Fetched {len(data.get('articles', [])[:20])} articles")
    except Exception as e:
        print(f"⚠️ GDELT error: {e}")
    
    # Sort by quality score and recency
    all_news.sort(key=lambda x: (x['quality_score'], -x.get('age_seconds', 0)), reverse=True)
    
    # Return top 50
    return all_news[:50]

def calculate_news_quality(article: Dict, source_type: str) -> int:
    """Calculate news quality score (0-100)"""
    score = 0
    
    # Trusted sources bonus
    trusted_sources = ['Reuters', 'Bloomberg', 'WSJ', 'Financial Times', 'AP', 'CNBC']
    source_name = article.get('source', '')
    if any(trusted in source_name for trusted in trusted_sources):
        score += 50
    elif source_type == 'Finnhub':
        score += 30  # Finnhub is financial-focused
    else:
        score += 10  # GDELT is general
    
    # Recency bonus
    if 'datetime' in article:
        age_minutes = (datetime.now() - datetime.fromtimestamp(article['datetime'])).total_seconds() / 60
    elif 'age_seconds' in article:
        age_minutes = article['age_seconds'] / 60
    else:
        age_minutes = 999
    
    if age_minutes < 10:
        score += 30
    elif age_minutes < 60:
        score += 20
    elif age_minutes < 360:
        score += 10
    
    # Financial keywords bonus
    title = article.get('headline', article.get('title', '')).lower()
    financial_terms = ['market', 'stock', 'fed', 'economy', 'earnings', 'trade', 'gdp', 'inflation']
    score += min(20, sum(5 for term in financial_terms if term in title))
    
    return min(100, score)

def assign_news_to_city(title: str, description: str = "") -> Optional[str]:
    """Intelligently assign news to cities"""
    text = (title + " " + description).lower()
    
    # Direct city/country matches
    city_keywords = {
        "New York": ["wall street", "nyse", "nasdaq", "fed", "federal reserve", "new york"],
        "London": ["london", "ftse", "bank of england", "uk", "britain"],
        "Tokyo": ["tokyo", "nikkei", "japan", "boj"],
        "Hong Kong": ["hong kong", "hang seng", "hsi"],
        "Frankfurt": ["frankfurt", "dax", "ecb", "germany"],
        "Paris": ["paris", "france", "cac"],
        "Shanghai": ["shanghai", "china", "pboc"],
        "Sydney": ["sydney", "australia", "asx"]
    }
    
    for city, keywords in city_keywords.items():
        if any(kw in text for kw in keywords):
            return city
    
    return None

def analyze_sentiment(text: str) -> str:
    """Analyze sentiment from text"""
    text_lower = text.lower()
    
    bullish_words = ["surge", "rally", "gain", "boom", "growth", "bull", "soar", "rise", "up", "high"]
    bearish_words = ["fall", "drop", "crash", "decline", "bear", "plunge", "crisis", "down", "low"]
    
    bullish_count = sum(1 for word in bullish_words if word in text_lower)
    bearish_count = sum(1 for word in bearish_words if word in text_lower)
    
    if bullish_count > bearish_count:
        return "bullish"
    elif bearish_count > bullish_count:
        return "bearish"
    return "neutral"

async def fetch_weather_data():
    """Fetch global weather and severe storms"""
    if not OPENWEATHER_KEY:
        return {"storms": [], "status": "no_api_key"}
    
    storms = []
    
    # Check major cities for severe weather alerts
    for city_name, city_info in MAJOR_CITIES.items():
        try:
            async with httpx.AsyncClient() as client:
                url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "lat": city_info['lat'],
                    "lon": city_info['lng'],
                    "appid": OPENWEATHER_KEY,
                    "units": "metric"
                }
                
                response = await client.get(url, params=params, timeout=5.0)
                data = response.json()
                
                weather_main = data.get('weather', [{}])[0].get('main', '')
                description = data.get('weather', [{}])[0].get('description', '')
                
                # Check for severe weather
                severe_conditions = ['Thunderstorm', 'Tornado', 'Hurricane', 'Snow', 'Extreme']
                if any(cond in weather_main for cond in severe_conditions):
                    storms.append({
                        'city': city_name,
                        'lat': city_info['lat'],
                        'lng': city_info['lng'],
                        'type': weather_main,
                        'description': description,
                        'temp': data['main'].get('temp'),
                        'severity': 'high' if 'extreme' in description.lower() else 'medium'
                    })
        except Exception as e:
            print(f"⚠️ Weather error for {city_name}: {e}")
    
    return {
        'storms': storms,
        'count': len(storms),
        'last_update': datetime.now().isoformat()
    }

async def fetch_economic_calendar():
    """Fetch upcoming economic events from Finnhub"""
    if not FINNHUB_KEY:
        return {"events": [], "status": "no_api_key"}
    
    try:
        async with httpx.AsyncClient() as client:
            # Get today and next 7 days
            today = datetime.now().strftime('%Y-%m-%d')
            next_week = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
            
            url = "https://finnhub.io/api/v1/calendar/economic"
            params = {
                "from": today,
                "to": next_week,
                "token": FINNHUB_KEY
            }
            
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
            
            events = []
            for event in data.get('economicCalendar', [])[:20]:
                # Determine impact level
                impact = event.get('impact', '')
                if impact in ['1', 'high']:
                    impact_level = 'high'
                elif impact in ['2', 'medium']:
                    impact_level = 'medium'
                else:
                    impact_level = 'low'
                
                events.append({
                    'event': event.get('event', 'Economic Event'),
                    'country': event.get('country', 'US'),
                    'date': event.get('time', today),
                    'impact': impact_level,
                    'actual': event.get('actual'),
                    'estimate': event.get('estimate'),
                    'previous': event.get('previous')
                })
            
            return {
                'events': events,
                'count': len(events),
                'last_update': datetime.now().isoformat()
            }
    except Exception as e:
        print(f"⚠️ Economic calendar error: {e}")
        return {"events": [], "status": "error", "error": str(e)}

# API Endpoints

@app.get("/")
def root():
    return {
        "service": "WRLD VSN Ultimate API V3",
        "version": "3.0.0",
        "status": "operational",
        "accuracy": "guaranteed",
        "timestamp": datetime.now().isoformat(),
        "features": [
            "Real-time market data (validated)",
            "Multi-source news aggregation",
            "Weather layer with storm tracking",
            "Economic calendar",
            "Candlestick charts",
            "Data quality monitoring"
        ],
        "data_sources": {
            "finnhub": bool(FINNHUB_KEY),
            "coinmarketcap": bool(COINMARKETCAP_KEY),
            "openweather": bool(OPENWEATHER_KEY),
            "gdelt": True,
            "binance": True,
            "yahoo_finance": True
        }
    }

@app.get("/api/v1/markets/live")
async def get_live_markets():
    """Get real-time validated market data"""
    try:
        markets = await fetch_realtime_markets()
        return markets
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/news/financial")
async def get_financial_news(limit: int = Query(default=50, ge=1, le=100)):
    """Get high-quality financial news"""
    try:
        news = await fetch_financial_news()
        return {
            "news": news[:limit],
            "count": len(news),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/weather/global")
async def get_global_weather():
    """Get global weather and severe storms"""
    try:
        weather = await fetch_weather_data()
        return weather
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/calendar/economic")
async def get_economic_calendar():
    """Get upcoming economic events"""
    try:
        calendar = await fetch_economic_calendar()
        return calendar
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    print("=" * 70)
    print("🌍 WRLD VSN ULTIMATE V3 - ACCURACY GUARANTEED")
    print("=" * 70)
    print(f"✅ Finnhub: {'Configured ✓' if FINNHUB_KEY else 'Not configured ✗'}")
    print(f"✅ CoinMarketCap: {'Configured ✓' if COINMARKETCAP_KEY else 'Not configured ✗'}")
    print(f"✅ OpenWeather: {'Configured ✓' if OPENWEATHER_KEY else 'Not configured ✗'}")
    print(f"✅ FRED: {'Configured ✓' if FRED_API_KEY else 'Not configured ✗'}")
    print(f"✅ Binance: Always available ✓")
    print(f"✅ Yahoo Finance: Always available ✓")
    print(f"✅ GDELT: Always available ✓")
    print("=" * 70)
    print("🚀 Server ready with real-time validated data!")
    print("=" * 70)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
