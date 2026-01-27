import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, X, Activity, Zap,
  Download, Settings,
  ChevronRight, FileText, Image as ImageIcon, ExternalLink, Satellite,
  DollarSign, Cloud,
  Calendar, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

mapboxgl.accessToken = MAPBOX_TOKEN;

const WorldMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapStyle, setMapStyle] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState(null);
  const [financialNews, setFinancialNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    
    console.log('🗺️ Initializing Mapbox GL map...');
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 20],
      zoom: 2,
      pitch: 45,
      projection: 'globe'
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    console.log('✅ Map initialized successfully!');
  }, []);

  // Fetch news
  useEffect(() => {
    const fetchNews = async () => {
      try {
        console.log('📡 Fetching news from:', API_URL);
        const newsRes = await fetch(`${API_URL}/api/v1/news/financial`);
        const newsData = await newsRes.json();
        console.log('📰 Got', newsData.news?.length, 'articles');
        setFinancialNews(newsData.news || []);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching news:', error);
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  const toggleMapStyle = () => {
    const styles = {
      dark: 'mapbox://styles/mapbox/dark-v11',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      streets: 'mapbox://styles/mapbox/streets-v12'
    };
    
    const nextStyle = mapStyle === 'dark' ? 'satellite' : mapStyle === 'satellite' ? 'streets' : 'dark';
    setMapStyle(nextStyle);
    
    if (map.current) {
      map.current.setStyle(styles[nextStyle]);
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div style={{height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000'}}>
        <div style={{textAlign: 'center'}}>
          <Loader style={{width: '64px', height: '64px', color: '#3b82f6', margin: '0 auto 16px', animation: 'spin 1s linear infinite'}} />
          <div style={{color: '#fff', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px'}}>WRLD VSN V3</div>
          <div style={{color: '#6b7280', fontSize: '14px'}}>Loading real-time intelligence...</div>
        </div>
      </div>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', padding: '20px'}}>
        <div style={{textAlign: 'center', maxWidth: '600px'}}>
          <AlertCircle style={{width: '64px', height: '64px', color: '#ef4444', margin: '0 auto 16px'}} />
          <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'}}>Mapbox Token Missing</h1>
          <p style={{color: '#9ca3af'}}>Add REACT_APP_MAPBOX_TOKEN to Vercel environment variables</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{height: '100vh', width: '100vw', position: 'relative', background: '#000', overflow: 'hidden', display: 'flex'}}>
      {/* Left Sidebar */}
      <div style={{width: '64px', background: '#030712', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px', zIndex: 30}}>
        <div style={{width: '44px', height: '44px', background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'}}>
          <Globe2 size={24} style={{color: '#fff'}} />
        </div>
        
        <div style={{width: '100%', height: '1px', background: '#1f2937', margin: '4px 0'}}></div>
        
        <button 
          onClick={toggleMapStyle}
          style={{width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer'}}
          title="Toggle Map Style"
        >
          <Satellite size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        {/* Top Bar */}
        <div style={{height: '64px', background: 'rgba(17, 24, 39, 0.95)', borderBottom: '1px solid #1f2937', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '32px'}}>
            <div>
              <div style={{color: '#fff', fontWeight: 'bold', fontSize: '20px'}}>WRLD VSN</div>
              <div style={{fontSize: '12px', color: '#6b7280'}}>V3 • Accuracy Guaranteed</div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(6, 78, 59, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)'}}>
              <div style={{width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%'}}></div>
              <span style={{color: '#4ade80', fontWeight: '600', fontSize: '12px'}}>LIVE</span>
            </div>
          </div>
          
          <div style={{color: '#6b7280', fontFamily: 'monospace', fontSize: '14px'}}>
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        {/* Map + News Feed */}
        <div style={{flex: 1, display: 'flex', position: 'relative'}}>
          {/* MAP CONTAINER */}
          <div 
            ref={mapContainer} 
            style={{
              flex: 1,
              position: 'relative',
              minHeight: 0
            }}
          />

          {/* RIGHT SIDEBAR - NEWS FEED */}
          <div style={{width: '384px', background: 'rgba(17, 24, 39, 0.98)', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', maxHeight: '100%'}}>
            <div style={{padding: '16px', borderBottom: '1px solid #1f2937'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{fontSize: '12px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.05em'}}>Live Intelligence Feed</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(6, 78, 59, 0.2)'}}>
                  <div style={{width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%'}}></div>
                  <span style={{color: '#4ade80', fontSize: '12px', fontWeight: '600'}}>LIVE</span>
                </div>
              </div>
              <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>{financialNews.length} articles • Quality filtered</div>
            </div>
            
            <div style={{flex: 1, overflowY: 'auto'}}>
              {financialNews.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{display: 'block', padding: '12px 16px', borderBottom: '1px solid rgba(31, 41, 55, 0.5)', textDecoration: 'none', cursor: 'pointer'}}
                >
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                    <div style={{
                      width: '6px',
                      minHeight: '60px',
                      borderRadius: '9999px',
                      marginTop: '4px',
                      flexShrink: 0,
                      background: article.sentiment === 'bullish' ? '#22c55e' : article.sentiment === 'bearish' ? '#ef4444' : '#eab308'
                    }}></div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize: '13px', color: '#fff', lineHeight: '1.4', marginBottom: '8px'}}>
                        {article.title}
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', flexWrap: 'wrap', gap: '4px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span style={{color: '#6b7280'}}>{article.source}</span>
                          {article.city && (
                            <>
                              <span style={{color: '#374151'}}>•</span>
                              <span style={{color: '#60a5fa'}}>{article.city}</span>
                            </>
                          )}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                          <span style={{color: '#4b5563', fontFamily: 'monospace', fontSize: '10px'}}>
                            {getRelativeTime(article.timestamp)}
                          </span>
                          <ExternalLink size={10} style={{color: '#4b5563'}} />
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
