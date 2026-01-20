# WRLD VSN - Getting Started Guide

## 🎯 Three Ways to Run WRLD VSN

### Option 1: Demo Mode (Fastest - No API Keys Needed)
**Best for**: Quick testing, development, seeing how it works

```bash
./demo-start.sh
```

This runs a backend with mock data. Visit `http://localhost:8000/docs` to see the API.

---

### Option 2: Full Stack with Docker (Recommended)
**Best for**: Production-like environment, full features

**Prerequisites:**
- Docker & Docker Compose installed
- At least 8GB RAM
- API keys (see below)

**Steps:**
1. Get your API keys (see API Keys section below)
2. Run the setup script:
```bash
./start.sh
```
3. Access the platform:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - Grafana: http://localhost:3001

---

### Option 3: Manual Development Setup
**Best for**: Active development, debugging

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**Database:**
```bash
# Install PostgreSQL with PostGIS
# Run: psql -U postgres -d wrld_vsn -f infrastructure/database/schema.sql
```

---

## 🔑 API Keys Setup

### Required (Basic Functionality)

#### 1. Mapbox Token
- **URL**: https://account.mapbox.com/
- **Free Tier**: 50,000 map loads/month
- **Steps**:
  1. Sign up for free account
  2. Go to "Access tokens"
  3. Copy your default public token
  4. Add to `.env`: `MAPBOX_TOKEN=pk.your_token_here`

### Optional (Enhanced Features)

#### 2. NewsAPI
- **URL**: https://newsapi.org/register
- **Free Tier**: 100 requests/day, 1 month history
- **Why**: Real news data instead of mocks
- Add to `.env`: `NEWSAPI_KEY=your_key_here`

#### 3. OpenCage Geocoding
- **URL**: https://opencagedata.com/api
- **Free Tier**: 2,500 requests/day
- **Why**: Converts city names to coordinates
- Add to `.env`: `OPENCAGE_API_KEY=your_key_here`

#### 4. Polygon.io (Stock Data)
- **URL**: https://polygon.io/
- **Free Tier**: 5 API calls/minute
- **Why**: Real-time US stock market data
- Add to `.env`: `POLYGON_API_KEY=your_key_here`

#### 5. Twitter/X API
- **URL**: https://developer.twitter.com/
- **Cost**: $100/month for basic tier
- **Why**: Real-time social sentiment
- Add to `.env`: 
  ```
  TWITTER_BEARER_TOKEN=your_token_here
  TWITTER_API_KEY=your_key_here
  TWITTER_API_SECRET=your_secret_here
  ```

---

## 📂 Project Structure

```
wrld-vsn/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   └── WorldMap.jsx
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── backend/               # FastAPI backend
│   ├── main.py           # Main API
│   ├── demo.py           # Demo mode with mocks
│   ├── requirements.txt
│   └── Dockerfile
│
├── ai-services/          # ML/AI services
│   ├── sentiment_analyzer.py
│   ├── sentiment_worker.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── data-pipeline/        # Data ingestion
│   ├── news_ingestion.py
│   ├── news_ingestion_worker.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── infrastructure/       # Infrastructure configs
│   └── database/
│       └── schema.sql
│
├── docker-compose.yml    # Full stack orchestration
├── .env.template         # Environment template
├── start.sh             # Quick start script
├── demo-start.sh        # Demo mode script
└── README.md
```

---

## 🚀 Quick Test Commands

Once running, try these:

### Check API Status
```bash
curl http://localhost:8000/ | python -m json.tool
```

### Get Global Sentiment
```bash
curl http://localhost:8000/api/v1/sentiment/global | python -m json.tool
```

### Get Breaking News
```bash
curl http://localhost:8000/api/v1/news/breaking?limit=5 | python -m json.tool
```

### Query Specific Location
```bash
# New York City
curl http://localhost:8000/api/v1/location/40.7128/-74.0060 | python -m json.tool
```

---

## 🐛 Troubleshooting

### Frontend won't load
1. Check Mapbox token is set in `.env`
2. Verify backend is running: `curl http://localhost:8000`
3. Check browser console for errors

### No data showing
1. Verify API keys are set
2. Check worker logs: `docker-compose logs news-ingestion`
3. Check database connection: `docker-compose logs postgres`

### Database errors
1. Ensure PostGIS extension is loaded
2. Check schema was applied: `docker-compose logs postgres`
3. Reset database: `docker-compose down -v && docker-compose up -d`

### Slow performance
1. Increase Docker memory (Docker Desktop → Settings → Resources)
2. Enable Redis caching in `.env`
3. Reduce batch sizes in worker configs

---

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f news-ingestion
docker-compose logs -f sentiment-analyzer
```

### Check Service Status
```bash
docker-compose ps
```

### Grafana Dashboards
1. Open http://localhost:3001
2. Login with admin/admin
3. Pre-configured dashboards show:
   - API performance
   - Sentiment metrics
   - Data pipeline health

---

## 🔄 Common Operations

### Restart Everything
```bash
docker-compose restart
```

### Stop Everything
```bash
docker-compose stop
```

### Full Reset (Delete All Data)
```bash
docker-compose down -v
./start.sh
```

### Update Code
```bash
git pull
docker-compose build
docker-compose up -d
```

### Scale Workers
```bash
# Run 3 sentiment workers
docker-compose up -d --scale sentiment-analyzer=3
```

---

## 🎓 Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Customize the Map**: Edit `frontend/src/components/WorldMap.jsx`
3. **Add Data Sources**: Extend `data-pipeline/news_ingestion.py`
4. **Train Custom Models**: Modify `ai-services/sentiment_analyzer.py`
5. **Create Dashboards**: Add panels in Grafana

---

## 📚 Additional Resources

- [API Documentation](http://localhost:8000/docs)
- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [Deck.gl Documentation](https://deck.gl/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL + PostGIS](https://postgis.net/)

---

## 💡 Tips

- **Start with Demo Mode** to understand the system
- **Use free API tiers** initially to test
- **Monitor logs** to understand data flow
- **Scale gradually** as you add features
- **Back up your `.env`** file

---

## 🤝 Need Help?

- Check logs: `docker-compose logs`
- Review README.md for architecture
- Open an issue on GitHub
- Join our Discord community

Happy mapping! 🌍
