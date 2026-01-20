-- WRLD VSN Database Schema
-- PostgreSQL with PostGIS and TimescaleDB extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- News articles with geospatial data
CREATE TABLE news_articles (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Geospatial
    location_name VARCHAR(255),
    coordinates GEOGRAPHY(POINT, 4326),  -- PostGIS geography type
    
    -- Metadata
    categories TEXT[],
    entities TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    credibility_score FLOAT CHECK (credibility_score >= 0 AND credibility_score <= 1),
    
    -- Sentiment (computed)
    sentiment_score FLOAT,
    sentiment_label VARCHAR(20),
    sentiment_confidence FLOAT,
    
    -- Indexing
    search_vector tsvector,
    
    CONSTRAINT valid_sentiment_score CHECK (
        sentiment_score IS NULL OR 
        (sentiment_score >= -1 AND sentiment_score <= 1)
    )
);

-- Indexes for news_articles
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_source ON news_articles(source);
CREATE INDEX idx_news_location ON news_articles USING GIST(coordinates);
CREATE INDEX idx_news_search ON news_articles USING GIN(search_vector);
CREATE INDEX idx_news_entities ON news_articles USING GIN(entities);

-- Make it a hypertable for time-series optimization
SELECT create_hypertable('news_articles', 'published_at', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================================
-- Social media posts
CREATE TABLE social_posts (
    id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,  -- twitter, reddit, telegram
    content TEXT NOT NULL,
    author_id VARCHAR(255),
    author_username VARCHAR(255),
    posted_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Geospatial (if available)
    coordinates GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    
    -- Engagement metrics
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    engagement_score FLOAT,  -- Weighted engagement metric
    
    -- Sentiment
    sentiment_score FLOAT,
    sentiment_label VARCHAR(20),
    
    -- Metadata
    entities TEXT[],
    hashtags TEXT[],
    mentioned_tickers TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    
    -- Quality control
    is_bot_likely BOOLEAN DEFAULT FALSE,
    credibility_score FLOAT,
    
    CONSTRAINT valid_sentiment CHECK (
        sentiment_score IS NULL OR 
        (sentiment_score >= -1 AND sentiment_score <= 1)
    )
);

CREATE INDEX idx_social_posted ON social_posts(posted_at DESC);
CREATE INDEX idx_social_platform ON social_posts(platform);
CREATE INDEX idx_social_location ON social_posts USING GIST(coordinates);
CREATE INDEX idx_social_entities ON social_posts USING GIN(entities);
CREATE INDEX idx_social_tickers ON social_posts USING GIN(mentioned_tickers);

SELECT create_hypertable('social_posts', 'posted_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================================
-- Market data
CREATE TABLE market_data (
    id SERIAL,
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Price data
    open DECIMAL(20, 4),
    high DECIMAL(20, 4),
    low DECIMAL(20, 4),
    close DECIMAL(20, 4),
    volume BIGINT,
    
    -- Additional metrics
    market_cap DECIMAL(30, 2),
    pe_ratio DECIMAL(10, 2),
    change_percent DECIMAL(10, 4),
    
    PRIMARY KEY (symbol, timestamp)
);

CREATE INDEX idx_market_symbol ON market_data(symbol, timestamp DESC);
CREATE INDEX idx_market_timestamp ON market_data(timestamp DESC);

SELECT create_hypertable('market_data', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================================
-- Company headquarters (for map visualization)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    
    -- Headquarters location
    hq_address TEXT,
    hq_city VARCHAR(100),
    hq_country VARCHAR(100),
    hq_coordinates GEOGRAPHY(POINT, 4326),
    
    -- Metadata
    market_cap_usd DECIMAL(30, 2),
    employee_count INTEGER,
    founded_year INTEGER,
    website VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_symbol ON companies(symbol);
CREATE INDEX idx_companies_hq ON companies USING GIST(hq_coordinates);
CREATE INDEX idx_companies_sector ON companies(sector);

-- ============================================================================
-- Aggregated sentiment by location
CREATE TABLE location_sentiment (
    id SERIAL,
    location_name VARCHAR(255) NOT NULL,
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Sentiment metrics
    sentiment_score FLOAT NOT NULL,
    sentiment_label VARCHAR(20),
    intensity INTEGER CHECK (intensity >= 0 AND intensity <= 100),
    
    -- Sample data
    news_count INTEGER DEFAULT 0,
    social_count INTEGER DEFAULT 0,
    total_sources INTEGER DEFAULT 0,
    
    -- Trending entities
    top_entities TEXT[],
    top_tickers TEXT[],
    
    PRIMARY KEY (location_name, timestamp)
);

CREATE INDEX idx_loc_sent_timestamp ON location_sentiment(timestamp DESC);
CREATE INDEX idx_loc_sent_coords ON location_sentiment USING GIST(coordinates);

SELECT create_hypertable('location_sentiment', 'timestamp',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ============================================================================
-- User alerts and watchlists
CREATE TABLE user_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,  -- sentiment, news, price
    
    -- Trigger conditions
    locations TEXT[],  -- List of locations to monitor
    keywords TEXT[],
    tickers TEXT[],
    sentiment_threshold FLOAT,
    
    -- Delivery
    delivery_method VARCHAR(50),  -- email, push, sms
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user ON user_alerts(user_id);
CREATE INDEX idx_alerts_active ON user_alerts(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- Event log (breaking events)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,  -- economic, political, disaster, market
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Geospatial
    coordinates GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    affected_radius_km FLOAT,  -- Radius of impact
    
    -- Impact assessment
    severity VARCHAR(20),  -- low, medium, high, critical
    market_impact_score FLOAT,
    
    -- Related entities
    related_tickers TEXT[],
    related_sectors TEXT[],
    
    -- Timing
    occurred_at TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Sources
    source_urls TEXT[],
    confidence_score FLOAT
);

CREATE INDEX idx_events_occurred ON events(occurred_at DESC);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_location ON events USING GIST(coordinates);

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Real-time sentiment heatmap (refresh every 5 minutes)
CREATE MATERIALIZED VIEW sentiment_heatmap AS
SELECT 
    ST_SnapToGrid(coordinates::geometry, 0.5)::geography as grid_point,
    AVG(sentiment_score) as avg_sentiment,
    COUNT(*) as data_points,
    MAX(posted_at) as latest_update
FROM social_posts
WHERE 
    posted_at > NOW() - INTERVAL '6 hours'
    AND coordinates IS NOT NULL
    AND NOT is_bot_likely
GROUP BY grid_point;

CREATE INDEX idx_heatmap_grid ON sentiment_heatmap USING GIST(grid_point);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION news_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_search_vector_trigger
    BEFORE INSERT OR UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION news_search_vector_update();

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    likes INTEGER,
    shares INTEGER,
    comments INTEGER
) RETURNS FLOAT AS $$
BEGIN
    RETURN (likes * 1.0 + shares * 3.0 + comments * 2.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Find all news within 100km of coordinates with sentiment
/*
SELECT 
    title,
    source,
    sentiment_label,
    sentiment_score,
    ST_Distance(coordinates, ST_GeogFromText('POINT(-74.006 40.7128)')) / 1000 as distance_km
FROM news_articles
WHERE 
    ST_DWithin(
        coordinates,
        ST_GeogFromText('POINT(-74.006 40.7128)'),
        100000  -- 100km in meters
    )
    AND published_at > NOW() - INTERVAL '24 hours'
ORDER BY published_at DESC;
*/

-- Aggregate sentiment by city
/*
SELECT 
    location_name,
    COUNT(*) as article_count,
    AVG(sentiment_score) as avg_sentiment,
    CASE 
        WHEN AVG(sentiment_score) > 0.2 THEN 'bullish'
        WHEN AVG(sentiment_score) < -0.2 THEN 'bearish'
        ELSE 'neutral'
    END as overall_sentiment
FROM news_articles
WHERE 
    published_at > NOW() - INTERVAL '24 hours'
    AND location_name IS NOT NULL
GROUP BY location_name
HAVING COUNT(*) >= 5
ORDER BY article_count DESC;
*/
