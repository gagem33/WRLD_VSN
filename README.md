# WRLD VSN - Geospatial Financial Intelligence Platform

A Bloomberg Terminal meets Google Maps - visualize global markets, news, and sentiment on an interactive world map.

![WRLD VSN Architecture](docs/architecture-diagram.png)

## 🌍 Features

### Core Capabilities
- **Interactive Map Interface**: Navigate from globe to street level with seamless data integration
- **Real-time Sentiment Heatmap**: See market mood across the world in real-time
- **Breaking News Engine**: Geotagged news from 50+ sources with credibility scoring
- **Market Terminal**: Track stocks, crypto, FX, and commodities with location context
- **Social Pulse**: Aggregate sentiment from Twitter/X, Reddit, and forums
- **Custom Alerts**: Get notified about events in your zones of interest

### AI-Powered Features
- Financial sentiment analysis (FinBERT)
- Entity recognition and tagging
- Duplicate story detection
- Bot filtering
- Event impact assessment

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + Mapbox + Deck.gl
│   (Port 3000)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   FastAPI       │  Python API Layer
│   (Port 8000)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌──▼──────┐
│Postgre│ │Redis │ │ Kafka   │ │ Qdrant  │
│SQL+   │ │Cache │ │ Stream  │ │ Vector  │
│PostGIS│ │      │ │         │ │ Search  │
└───────┘ └──────┘ └────┬────┘ └─────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
        ┌─────▼─────┐      ┌─────▼──────┐
        │   News    │      │ Sentiment  │
        │ Ingestion │      │ Analysis   │
        │  Worker   │      │  Worker    │
        └───────────┘      └────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM
- API keys (see Setup section)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/wrld-vsn.git
cd wrld-vsn
```

2. **Configure environment**
```bash
cp .env.template .env
# Edit .env with your API keys
```

3. **Start the stack**
```bash
docker-compose up -d
```

4. **Access the application**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Grafana: http://localhost:3001 (admin/admin)

### Development Setup

For local development without Docker:

1. **Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

2. **Frontend**
```bash
cd frontend
npm install
npm start
```

3. **Database**
```bash
# Install PostgreSQL with PostGIS
# Run schema: psql -U postgres -d wrld_vsn -f infrastructure/database/schema.sql
```

## 📊 Data Sources

### News (Free Tier Available)
- **GDELT**: Global news monitoring (free)
- **NewsAPI**: 100 articles/day free
- **RSS Feeds**: Custom sources

### Market Data
- **Polygon.io**: 5 calls/min free
- **Alpaca**: Free tier available
- **Binance**: Free for crypto

### Social Media
- **Twitter/X**: $100/month for 10K tweets
- **Reddit**: Free API
- **Telegram**: Custom scraping

### Geocoding
- **OpenCage**: 2,500 requests/day free
- **Mapbox**: 50K map loads/month free

## 🔑 API Keys Setup

### Required (Free Tiers)
1. **Mapbox** (https://mapbox.com)
   - Sign up → Create token → Copy to `.env`
   
2. **NewsAPI** (https://newsapi.org)
   - Register → Get API key → Add to `.env`

3. **OpenCage** (https://opencagedata.com)
   - Sign up → Get key → Add to `.env`

### Optional (Enhanced Features)
4. **Polygon** (https://polygon.io)
   - For US stock data
   
5. **Twitter/X** (https://developer.twitter.com)
   - For real-time social sentiment

6. **Alpaca** (https://alpaca.markets)
   - For extended market data

## 📖 Usage Guide

### Basic Operations

**1. View Global Sentiment**
- Open the app
- See color-coded heatmap (red = bearish, blue = bullish)
- Click any region to see details

**2. Track Breaking News**
- Red pulsing markers = high urgency
- Click marker to see full story
- Filter by category in sidebar

**3. Monitor Companies**
- Search for ticker/company
- See HQ location on map
- View related news and sentiment

**4. Create Watchlist**
- Click "Add to Watchlist"
- Draw custom region on map
- Set alert thresholds

**5. Historical Playback**
- Use timeline slider
- Replay events from past 30 days
- See how sentiment evolved

### API Examples

**Get sentiment for location**
```bash
curl http://localhost:8000/api/v1/location/40.7128/-74.0060
```

**WebSocket live feed**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/live-feed');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('New update:', update);
};
```

**Search news**
```bash
curl "http://localhost:8000/api/v1/news/breaking?limit=10"
```

## 🧠 AI Components

### Sentiment Analysis
- **Model**: ProsusAI/FinBERT (fine-tuned BERT for financial text)
- **Output**: Score from -1 (bearish) to +1 (bullish)
- **Confidence**: Model certainty (0-1)

### Entity Recognition
- Extracts: Companies, tickers, people, locations
- Used for: Tagging, search, relevance scoring

### Duplicate Detection
- Semantic similarity using sentence transformers
- Groups similar stories
- Prevents double-counting sentiment

### Bot Detection
- Account age, posting frequency
- Content patterns
- Engagement ratios

## 🔒 Security Features

### Source Credibility Scoring
```
Score = (source_reputation × 0.4) + 
        (author_reputation × 0.3) + 
        (fact_check_status × 0.3)
```

### Bot Detection
- Machine learning classifier
- Pattern analysis
- Engagement metrics

### Rate Limiting
- 100 requests/minute per IP
- Configurable in `.env`

### Data Validation
- Input sanitization
- SQL injection prevention
- XSS protection

## 📈 Performance Optimization

### Caching Strategy
- Redis cache for API responses (5 min TTL)
- Materialized views for heatmap data
- CDN for static assets

### Database Indexing
- Geospatial indexes (PostGIS)
- Time-series optimization (TimescaleDB)
- Full-text search (pg_trgm)

### Scaling
- Horizontal scaling via Docker Swarm/K8s
- Read replicas for PostgreSQL
- Kafka partitioning for high throughput

## 🧪 Testing

Run the test suite:
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up
```

## 📊 Monitoring

### Grafana Dashboards
- Real-time sentiment metrics
- API performance
- Data pipeline health
- Alert triggers

### Prometheus Metrics
- Request latency
- Error rates
- Queue depths
- Cache hit rates

## 🛠️ Configuration

### Sentiment Thresholds
```python
# backend/config.py
SENTIMENT_THRESHOLDS = {
    'bullish': 0.2,    # Score > 0.2
    'bearish': -0.2,   # Score < -0.2
    'neutral': 0.0     # -0.2 to 0.2
}
```

### Map Styles
```javascript
// frontend/src/config.js
export const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
};
```

## 🐛 Troubleshooting

### Common Issues

**1. Map not loading**
- Check Mapbox token in `.env`
- Verify network access to Mapbox API

**2. No data appearing**
- Ensure news ingestion worker is running
- Check API keys are valid
- Review logs: `docker-compose logs -f news-ingestion`

**3. Slow performance**
- Increase cache TTL
- Enable database query optimization
- Check Redis connection

**4. High memory usage**
- Reduce batch sizes
- Limit concurrent workers
- Adjust Docker memory limits

## 🗺️ Roadmap

### Phase 1 (Current) - MVP
- [x] Basic map interface
- [x] Sentiment heatmap
- [x] News ingestion
- [x] API foundation

### Phase 2 - Enhanced Analytics
- [ ] Options flow tracking
- [ ] Insider trading alerts
- [ ] Earnings calendar integration
- [ ] Macro economic indicators

### Phase 3 - Social Features
- [ ] User portfolios
- [ ] Collaborative watchlists
- [ ] Social sharing
- [ ] Community sentiment

### Phase 4 - Advanced AI
- [ ] Predictive models
- [ ] Anomaly detection
- [ ] Causal event analysis
- [ ] Multi-lingual support

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FinBERT by ProsusAI
- GDELT Project
- Mapbox
- TimescaleDB team
- Open source community

## 📞 Support

- Documentation: [docs.wrldvsn.com](https://docs.wrldvsn.com)
- Issues: [GitHub Issues](https://github.com/your-org/wrld-vsn/issues)
- Discord: [Join our community](https://discord.gg/wrldvsn)
- Email: support@wrldvsn.com

## ⚡ Quick Reference

### Useful Commands
```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Run database migrations
docker-compose exec postgres psql -U wrld_admin -d wrld_vsn -f /schema.sql

# Access PostgreSQL
docker-compose exec postgres psql -U wrld_admin -d wrld_vsn

# Clear cache
docker-compose exec redis redis-cli FLUSHALL

# Monitor Kafka topics
docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic news-events
```

---

Built with ❤️ for the financial community
