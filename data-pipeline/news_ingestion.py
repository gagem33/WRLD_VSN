"""
News Ingestion Pipeline for WRLD VSN
Aggregates news from multiple sources, geocodes them, and processes for sentiment
"""

import asyncio
import aiohttp
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import hashlib
import json
from urllib.parse import quote

@dataclass
class NewsArticle:
    id: str
    title: str
    summary: str
    content: str
    source: str
    author: Optional[str]
    url: str
    published_at: datetime
    coordinates: Optional[Dict[str, float]]  # {lat, lng}
    location_name: Optional[str]
    categories: List[str]
    entities: List[str]
    credibility_score: float
    language: str = "en"
    
    def to_dict(self):
        return asdict(self)

class NewsSource:
    """Base class for news sources"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.credibility_score = 0.7  # Override per source
    
    async def fetch_articles(
        self,
        query: str = None,
        from_date: datetime = None,
        to_date: datetime = None,
        limit: int = 100
    ) -> List[NewsArticle]:
        raise NotImplementedError

class NewsAPISource(NewsSource):
    """NewsAPI.org integration"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://newsapi.org/v2"
        self.credibility_score = 0.75
    
    async def fetch_articles(
        self,
        query: str = None,
        from_date: datetime = None,
        to_date: datetime = None,
        limit: int = 100
    ) -> List[NewsArticle]:
        
        params = {
            "apiKey": self.api_key,
            "pageSize": min(limit, 100),
            "language": "en",
            "sortBy": "publishedAt"
        }
        
        if query:
            params["q"] = query
        if from_date:
            params["from"] = from_date.isoformat()
        if to_date:
            params["to"] = to_date.isoformat()
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/everything",
                params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return [self._parse_article(art) for art in data.get("articles", [])]
                else:
                    print(f"NewsAPI error: {response.status}")
                    return []
    
    def _parse_article(self, raw: Dict) -> NewsArticle:
        # Generate unique ID
        article_id = hashlib.md5(
            f"{raw.get('url', '')}{raw.get('publishedAt', '')}".encode()
        ).hexdigest()
        
        return NewsArticle(
            id=article_id,
            title=raw.get("title", ""),
            summary=raw.get("description", ""),
            content=raw.get("content", raw.get("description", "")),
            source=raw.get("source", {}).get("name", "Unknown"),
            author=raw.get("author"),
            url=raw.get("url", ""),
            published_at=datetime.fromisoformat(
                raw.get("publishedAt", "").replace("Z", "+00:00")
            ),
            coordinates=None,  # Will be geocoded
            location_name=None,
            categories=[],
            entities=[],
            credibility_score=self.credibility_score,
            language="en"
        )

class GDELTSource(NewsSource):
    """
    GDELT (Global Database of Events, Language, and Tone)
    Free, comprehensive news monitoring
    """
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
        self.credibility_score = 0.8  # GDELT aggregates from many sources
    
    async def fetch_articles(
        self,
        query: str = None,
        from_date: datetime = None,
        to_date: datetime = None,
        limit: int = 100
    ) -> List[NewsArticle]:
        
        # GDELT uses specific date format
        if from_date:
            start_date = from_date.strftime("%Y%m%d%H%M%S")
        else:
            start_date = (datetime.now() - timedelta(hours=24)).strftime("%Y%m%d%H%M%S")
        
        params = {
            "query": query or "market OR economy OR finance",
            "mode": "artlist",
            "maxrecords": limit,
            "format": "json",
            "startdatetime": start_date,
            "sort": "datedesc"
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        articles = data.get("articles", [])
                        return [self._parse_article(art) for art in articles[:limit]]
            except Exception as e:
                print(f"GDELT error: {e}")
                return []
        
        return []
    
    def _parse_article(self, raw: Dict) -> NewsArticle:
        article_id = hashlib.md5(raw.get("url", "").encode()).hexdigest()
        
        # GDELT provides coordinates!
        coords = None
        if raw.get("sharingimage"):  # Sometimes includes geocoding
            # This is simplified - GDELT V2 has better geocoding
            pass
        
        return NewsArticle(
            id=article_id,
            title=raw.get("title", ""),
            summary=raw.get("seendate", ""),  # GDELT doesn't always have summaries
            content="",  # Would need to fetch full article
            source=raw.get("domain", "Unknown"),
            author=None,
            url=raw.get("url", ""),
            published_at=datetime.strptime(
                raw.get("seendate", "20240101000000"),
                "%Y%m%d%H%M%S"
            ),
            coordinates=coords,
            location_name=None,
            categories=[],
            entities=[],
            credibility_score=self.credibility_score,
            language=raw.get("language", "en")
        )

class Geocoder:
    """
    Geocode news articles using location extraction and geocoding APIs
    """
    
    def __init__(self, opencage_api_key: str = None):
        self.api_key = opencage_api_key
        self.base_url = "https://api.opencagedata.com/geocode/v1/json"
        self.cache = {}  # Simple in-memory cache
    
    async def geocode_article(self, article: NewsArticle) -> NewsArticle:
        """
        Extract location from article and geocode it
        """
        # If already has coordinates, return as-is
        if article.coordinates:
            return article
        
        # Extract location mentions from title and content
        location = self._extract_location(article.title, article.content)
        
        if not location:
            return article
        
        # Check cache
        if location in self.cache:
            coords = self.cache[location]
            article.coordinates = coords
            article.location_name = location
            return article
        
        # Geocode
        coords = await self._geocode(location)
        if coords:
            self.cache[location] = coords
            article.coordinates = coords
            article.location_name = location
        
        return article
    
    def _extract_location(self, title: str, content: str) -> Optional[str]:
        """
        Extract location mentions from text
        This is simplified - use spaCy NER in production
        """
        # Common financial centers and major cities
        locations = [
            "New York", "London", "Tokyo", "Hong Kong", "Shanghai",
            "Singapore", "Frankfurt", "Paris", "Sydney", "Toronto",
            "Chicago", "San Francisco", "Beijing", "Seoul", "Mumbai",
            "Dubai", "Zurich", "Amsterdam", "Stockholm", "Washington"
        ]
        
        text = f"{title} {content}".lower()
        
        for location in locations:
            if location.lower() in text:
                return location
        
        return None
    
    async def _geocode(self, location: str) -> Optional[Dict[str, float]]:
        """
        Geocode location name to coordinates
        """
        if not self.api_key:
            # Fallback to hardcoded major cities
            return self._fallback_geocode(location)
        
        params = {
            "q": location,
            "key": self.api_key,
            "limit": 1
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("results", [])
                        if results:
                            geo = results[0]["geometry"]
                            return {"lat": geo["lat"], "lng": geo["lng"]}
            except Exception as e:
                print(f"Geocoding error: {e}")
        
        return self._fallback_geocode(location)
    
    def _fallback_geocode(self, location: str) -> Optional[Dict[str, float]]:
        """Hardcoded coordinates for major financial centers"""
        coords_map = {
            "new york": {"lat": 40.7128, "lng": -74.0060},
            "london": {"lat": 51.5074, "lng": -0.1278},
            "tokyo": {"lat": 35.6762, "lng": 139.6503},
            "hong kong": {"lat": 22.3193, "lng": 114.1694},
            "shanghai": {"lat": 31.2304, "lng": 121.4737},
            "singapore": {"lat": 1.3521, "lng": 103.8198},
            "frankfurt": {"lat": 50.1109, "lng": 8.6821},
            "paris": {"lat": 48.8566, "lng": 2.3522},
            "sydney": {"lat": -33.8688, "lng": 151.2093},
            "toronto": {"lat": 43.6532, "lng": -79.3832},
        }
        return coords_map.get(location.lower())

class NewsIngestionPipeline:
    """
    Main pipeline coordinator
    """
    
    def __init__(
        self,
        newsapi_key: str = None,
        opencage_key: str = None
    ):
        self.sources = []
        
        if newsapi_key:
            self.sources.append(NewsAPISource(newsapi_key))
        
        # GDELT is free
        self.sources.append(GDELTSource())
        
        self.geocoder = Geocoder(opencage_key)
    
    async def fetch_and_process(
        self,
        query: str = None,
        hours_back: int = 24,
        limit_per_source: int = 50
    ) -> List[NewsArticle]:
        """
        Fetch articles from all sources, geocode, and deduplicate
        """
        from_date = datetime.now() - timedelta(hours=hours_back)
        
        # Fetch from all sources concurrently
        tasks = [
            source.fetch_articles(query, from_date, limit=limit_per_source)
            for source in self.sources
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Flatten
        all_articles = [art for source_arts in results for art in source_arts]
        
        # Geocode articles
        geocoded = await asyncio.gather(*[
            self.geocoder.geocode_article(art) for art in all_articles
        ])
        
        # Deduplicate by URL
        seen_urls = set()
        unique_articles = []
        
        for article in geocoded:
            if article.url not in seen_urls:
                seen_urls.add(article.url)
                unique_articles.append(article)
        
        return unique_articles

# Example usage
async def main():
    pipeline = NewsIngestionPipeline(
        newsapi_key="YOUR_NEWSAPI_KEY",  # Get from newsapi.org
        opencage_key="YOUR_OPENCAGE_KEY"  # Optional, get from opencagedata.com
    )
    
    articles = await pipeline.fetch_and_process(
        query="federal reserve OR interest rates OR stock market",
        hours_back=24,
        limit_per_source=20
    )
    
    print(f"Fetched {len(articles)} unique articles")
    
    for article in articles[:5]:
        print(f"\nTitle: {article.title}")
        print(f"Source: {article.source}")
        print(f"Location: {article.location_name} {article.coordinates}")
        print(f"Published: {article.published_at}")

if __name__ == "__main__":
    asyncio.run(main())
