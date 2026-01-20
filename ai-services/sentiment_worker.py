"""
Sentiment Analysis Worker
Consumes messages from Kafka, analyzes sentiment, and stores results
"""

import json
import logging
from kafka import KafkaConsumer, KafkaProducer
from sentiment_analyzer import SentimentAnalyzer
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SentimentWorker:
    def __init__(self):
        kafka_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        
        # Consumer for incoming text
        self.consumer = KafkaConsumer(
            'news-raw',
            'social-raw',
            bootstrap_servers=kafka_servers.split(','),
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            group_id='sentiment-workers',
            auto_offset_reset='latest'
        )
        
        # Producer for analyzed results
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_servers.split(','),
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        # Initialize sentiment analyzer
        model_name = os.getenv('MODEL_NAME', 'ProsusAI/finbert')
        self.analyzer = SentimentAnalyzer(model_name=model_name)
        
        logger.info(f"Sentiment worker initialized, listening on Kafka: {kafka_servers}")
    
    def process_message(self, message):
        """Process a single message"""
        try:
            data = message.value
            text = data.get('text') or data.get('content') or data.get('title', '')
            
            if not text:
                logger.warning(f"No text found in message: {data}")
                return
            
            # Analyze sentiment
            result = self.analyzer.analyze_single(text)
            
            # Enrich original data with sentiment
            enriched = {
                **data,
                'sentiment_score': result.score,
                'sentiment_label': result.label,
                'sentiment_confidence': result.confidence,
                'entities': result.entities,
                'analyzed_at': datetime.now().isoformat()
            }
            
            # Determine output topic based on source
            topic = message.topic.replace('-raw', '-analyzed')
            
            # Publish to output topic
            self.producer.send(topic, enriched)
            
            logger.info(
                f"Analyzed: {text[:50]}... -> {result.label} ({result.score:.3f})"
            )
            
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
    
    def run(self):
        """Main worker loop"""
        logger.info("Starting sentiment analysis worker...")
        
        try:
            for message in self.consumer:
                self.process_message(message)
        except KeyboardInterrupt:
            logger.info("Shutting down worker...")
        finally:
            self.consumer.close()
            self.producer.close()

if __name__ == "__main__":
    worker = SentimentWorker()
    worker.run()
