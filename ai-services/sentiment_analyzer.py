"""
Sentiment Analysis Engine for WRLD VSN
Processes social media, news, and market commentary to generate sentiment scores
"""

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer
import torch
import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime
import re

@dataclass
class SentimentResult:
    text: str
    score: float  # -1 to 1
    confidence: float
    label: str  # bullish, bearish, neutral
    entities: List[str]
    timestamp: datetime

class SentimentAnalyzer:
    def __init__(self, model_name: str = "ProsusAI/finbert"):
        """
        Initialize sentiment analyzer with FinBERT for financial text
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        # For semantic similarity and clustering
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Financial entities and keywords
        self.bullish_keywords = [
            'rally', 'surge', 'gain', 'soar', 'bullish', 'growth', 'profit',
            'upgrade', 'beat', 'strong', 'optimistic', 'positive', 'buy'
        ]
        self.bearish_keywords = [
            'crash', 'plunge', 'fall', 'bearish', 'loss', 'miss', 'weak',
            'downgrade', 'sell', 'negative', 'decline', 'concern', 'risk'
        ]
    
    def preprocess_text(self, text: str) -> str:
        """Clean and prepare text for analysis"""
        # Remove URLs
        text = re.sub(r'http\S+|www.\S+', '', text)
        # Remove mentions and hashtags symbols (keep the words)
        text = re.sub(r'[@#]', '', text)
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def analyze_single(self, text: str) -> SentimentResult:
        """Analyze sentiment of a single text"""
        cleaned_text = self.preprocess_text(text)
        
        # Tokenize and analyze
        inputs = self.tokenizer(
            cleaned_text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # FinBERT outputs: [positive, negative, neutral]
        probs = predictions[0].cpu().numpy()
        
        # Convert to -1 to 1 scale
        sentiment_score = probs[0] - probs[1]  # positive - negative
        confidence = max(probs)
        
        # Determine label
        if sentiment_score > 0.2:
            label = "bullish"
        elif sentiment_score < -0.2:
            label = "bearish"
        else:
            label = "neutral"
        
        # Extract entities (simplified - use NER in production)
        entities = self.extract_entities(cleaned_text)
        
        return SentimentResult(
            text=cleaned_text,
            score=float(sentiment_score),
            confidence=float(confidence),
            label=label,
            entities=entities,
            timestamp=datetime.now()
        )
    
    def analyze_batch(self, texts: List[str]) -> List[SentimentResult]:
        """Analyze multiple texts efficiently"""
        return [self.analyze_single(text) for text in texts]
    
    def extract_entities(self, text: str) -> List[str]:
        """Extract financial entities (tickers, companies, etc.)"""
        # Simple regex patterns - enhance with proper NER
        entities = []
        
        # Stock tickers (simplified)
        tickers = re.findall(r'\$[A-Z]{1,5}\b', text)
        entities.extend(tickers)
        
        # Common company names (would use NER in production)
        # This is a placeholder
        
        return list(set(entities))
    
    def aggregate_sentiment(
        self,
        results: List[SentimentResult],
        weights: List[float] = None
    ) -> Tuple[float, str]:
        """
        Aggregate multiple sentiment scores into overall sentiment
        
        Args:
            results: List of sentiment results
            weights: Optional weights for each result (e.g., by source credibility)
        
        Returns:
            Tuple of (aggregate_score, aggregate_label)
        """
        if not results:
            return 0.0, "neutral"
        
        if weights is None:
            weights = [1.0] * len(results)
        
        # Weighted average
        scores = [r.score * w for r, w in zip(results, weights)]
        total_weight = sum(weights)
        
        aggregate_score = sum(scores) / total_weight if total_weight > 0 else 0.0
        
        # Determine label
        if aggregate_score > 0.2:
            label = "bullish"
        elif aggregate_score < -0.2:
            label = "bearish"
        else:
            label = "neutral"
        
        return aggregate_score, label
    
    def cluster_similar_texts(
        self,
        texts: List[str],
        threshold: float = 0.8
    ) -> List[List[int]]:
        """
        Group similar texts together to identify trending topics
        
        Returns:
            List of clusters, where each cluster is a list of indices
        """
        if len(texts) < 2:
            return [[0]] if texts else []
        
        # Get embeddings
        embeddings = self.sentence_model.encode(texts)
        
        # Calculate similarity matrix
        from sklearn.metrics.pairwise import cosine_similarity
        similarity_matrix = cosine_similarity(embeddings)
        
        # Simple clustering based on threshold
        clusters = []
        used = set()
        
        for i in range(len(texts)):
            if i in used:
                continue
            
            cluster = [i]
            used.add(i)
            
            for j in range(i + 1, len(texts)):
                if j not in used and similarity_matrix[i][j] > threshold:
                    cluster.append(j)
                    used.add(j)
            
            clusters.append(cluster)
        
        return clusters

class GeospatialSentimentAggregator:
    """
    Aggregates sentiment data by geographic location
    """
    
    def __init__(self):
        self.analyzer = SentimentAnalyzer()
    
    def calculate_location_sentiment(
        self,
        location_data: List[Dict],
        radius_km: float = 50
    ) -> Dict:
        """
        Calculate aggregate sentiment for a geographic area
        
        Args:
            location_data: List of dicts with 'text', 'lat', 'lng', 'timestamp'
            radius_km: Radius to consider for aggregation
        
        Returns:
            Dictionary with sentiment metrics
        """
        if not location_data:
            return {
                "sentiment_score": 0.0,
                "label": "neutral",
                "intensity": 0,
                "sample_size": 0
            }
        
        # Analyze all texts
        texts = [item['text'] for item in location_data]
        results = self.analyzer.analyze_batch(texts)
        
        # Calculate time-weighted scores (more recent = more weight)
        now = datetime.now()
        weights = []
        for item in location_data:
            age_hours = (now - item['timestamp']).total_seconds() / 3600
            # Exponential decay: half-life of 6 hours
            weight = 2 ** (-age_hours / 6)
            weights.append(weight)
        
        aggregate_score, label = self.analyzer.aggregate_sentiment(results, weights)
        
        # Calculate intensity (0-100) based on volume and recency
        intensity = min(100, len(location_data) * 10)
        
        return {
            "sentiment_score": aggregate_score,
            "label": label,
            "intensity": intensity,
            "sample_size": len(location_data),
            "trending_entities": self._extract_trending_entities(results)
        }
    
    def _extract_trending_entities(
        self,
        results: List[SentimentResult],
        top_n: int = 5
    ) -> List[str]:
        """Extract most mentioned entities"""
        from collections import Counter
        
        all_entities = []
        for result in results:
            all_entities.extend(result.entities)
        
        if not all_entities:
            return []
        
        counter = Counter(all_entities)
        return [entity for entity, count in counter.most_common(top_n)]

# Example usage
if __name__ == "__main__":
    analyzer = SentimentAnalyzer()
    
    # Test texts
    texts = [
        "Federal Reserve signals potential rate cuts, market rallies on optimism",
        "Tech stocks plunge amid recession fears and weak earnings",
        "Oil prices remain stable as supply concerns balanced by demand"
    ]
    
    results = analyzer.analyze_batch(texts)
    
    for result in results:
        print(f"Text: {result.text[:50]}...")
        print(f"Sentiment: {result.label} ({result.score:.3f})")
        print(f"Confidence: {result.confidence:.3f}")
        print(f"Entities: {result.entities}")
        print("-" * 50)
