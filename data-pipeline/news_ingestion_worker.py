"""
News Ingestion Worker
Continuously fetches news from various sources and publishes to Kafka
"""

import asyncio
import logging
import os
from datetime import datetime
import json
from kafka import KafkaProducer
from news_ingestion import NewsIngestionPipeline
import asyncpg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsIngestionWorker:
    def __init__(self):
        kafka_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        
        # Kafka producer
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_servers.split(','),
            value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8')
        )
        
        # News pipeline
        self.pipeline = NewsIngestionPipeline(
            newsapi_key=os.getenv('NEWSAPI_KEY'),
            opencage_key=os.getenv('OPENCAGE_API_KEY')
        )
        
        # Database connection
        self.db_url = os.getenv('DATABASE_URL')
        self.db_pool = None
        
        # Configuration
        self.fetch_interval = int(os.getenv('NEWS_FETCH_INTERVAL', '300'))  # 5 minutes
        self.hours_back = int(os.getenv('NEWS_HOURS_BACK', '6'))
        
        logger.info(f"News ingestion worker initialized")
    
    async def init_db(self):
        """Initialize database connection pool"""
        if self.db_url:
            self.db_pool = await asyncpg.create_pool(self.db_url)
            logger.info("Database pool created")
    
    async def store_article(self, article):
        """Store article in database"""
        if not self.db_pool:
            return
        
        try:
            async with self.db_pool.acquire() as conn:
                # Insert or update article
                await conn.execute("""
                    INSERT INTO news_articles (
                        id, title, summary, content, source, author, url,
                        published_at, location_name, coordinates, categories,
                        entities, language, credibility_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
                              ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography,
                              $12, $13, $14, $15)
                    ON CONFLICT (url) DO UPDATE SET
                        title = EXCLUDED.title,
                        summary = EXCLUDED.summary,
                        content = EXCLUDED.content
                """, 
                    article.id,
                    article.title,
                    article.summary,
                    article.content,
                    article.source,
                    article.author,
                    article.url,
                    article.published_at,
                    article.location_name,
                    article.coordinates['lng'] if article.coordinates else None,
                    article.coordinates['lat'] if article.coordinates else None,
                    article.categories,
                    article.entities,
                    article.language,
                    article.credibility_score
                )
        except Exception as e:
            logger.error(f"Error storing article: {e}")
    
    async def fetch_and_publish(self):
        """Fetch news and publish to Kafka"""
        try:
            logger.info(f"Fetching news from past {self.hours_back} hours...")
            
            # Fetch articles
            articles = await self.pipeline.fetch_and_process(
                query="market OR economy OR finance OR stock OR crypto",
                hours_back=self.hours_back,
                limit_per_source=50
            )
            
            logger.info(f"Fetched {len(articles)} articles")
            
            # Process each article
            for article in articles:
                # Publish to Kafka for sentiment analysis
                message = {
                    'id': article.id,
                    'title': article.title,
                    'content': article.content or article.summary,
                    'source': article.source,
                    'url': article.url,
                    'published_at': article.published_at.isoformat(),
                    'coordinates': article.coordinates,
                    'location_name': article.location_name,
                    'credibility_score': article.credibility_score
                }
                
                self.producer.send('news-raw', message)
                
                # Store in database
                await self.store_article(article)
            
            self.producer.flush()
            logger.info(f"Published {len(articles)} articles to Kafka")
            
        except Exception as e:
            logger.error(f"Error in fetch_and_publish: {e}", exc_info=True)
    
    async def run(self):
        """Main worker loop"""
        await self.init_db()
        
        logger.info(f"Starting news ingestion (interval: {self.fetch_interval}s)")
        
        try:
            while True:
                await self.fetch_and_publish()
                await asyncio.sleep(self.fetch_interval)
                
        except KeyboardInterrupt:
            logger.info("Shutting down worker...")
        finally:
            self.producer.close()
            if self.db_pool:
                await self.db_pool.close()

async def main():
    worker = NewsIngestionWorker()
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
