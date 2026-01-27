import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, X, Activity, Zap, TrendingUp, TrendingDown,
  Download, Settings,
  ChevronRight, FileText, Image as ImageIcon, ExternalLink, Satellite,
  DollarSign, Cloud,
  Calendar, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

// DEBUG: Log environment variables
console.log('🔑 MAPBOX TOKEN:', MAPBOX_TOKEN ? 'EXISTS (length: ' + MAPBOX_TOKEN.length + ')' : 'MISSING');
console.log('🌐 API URL:', API_URL || 'MISSING');

const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12'
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

const CandlestickChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-gray-500 text-xs">No chart data</div>;

  const chartData = data.map(candle => ({
    ...candle,
    upperShadow: candle.high - Math.max(candle.open, candle.close),
    lowerShadow: Math.min(candle.open, candle.close) - candle.low,
    body: Math.abs(candle.close - candle.open),
    bodyBase: Math.min(candle.open, candle.close),
    isGreen: candle.close >= candle.open
  }));

  return (
    <ResponsiveContainer width="100%" height={80}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="timestamp" hide />
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              return (
                <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs">
                  <div className="text-white">O: {data.open.toFixed(2)}</div>
                  <div className="text-white">H: {data.high.toFixed(2)}</div>
                  <div className="text-white">L: {data.low.toFixed(2)}</div>
                  <div className="text-white">C: {data.close.toFixed(2)}</div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="body" stackId="candle" fill={(d) => d.isGreen ? '#10b981' : '#ef4444'} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const WorldMap = () => {
  const mapRef = useRef(null);
  const [viewMode, setViewMode] = useState('globe');
  const [mapStyle, setMapStyle] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [activePanel, setActivePanel] = useState(null);
  const [showWeatherLayer, setShowWeatherLayer] = useState(false);
  
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 45,
    bearing: 0
  });

  // Data states
  const [liveMarkets, setLiveMarkets] = useState(null);
  const [financialNews, setFinancialNews] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [economicCalendar, setEconomicCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataQuality, setDataQuality] = useState({});

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleViewMode = () => {
    const newMode = viewMode === 'globe' ? 'flat' : 'globe';
    setViewMode(newMode);
    
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        map.setProjection(newMode === 'globe' ? 'globe' : 'mercator');
      }
    }
    
    setViewport(prev => ({
      ...prev,
      pitch: newMode === 'flat' ? 0 : 45,
      zoom: newMode === 'flat' ? 1.5 : 2
    }));
  };

  // Fetch comprehensive data with smart intervals
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        console.log('📡 Fetching data from:', API_URL);
        
        // Fetch markets (fast refresh)
        const marketsRes = await fetch(`${API_URL}/api/v1/markets/live`);
        const marketsData = await marketsRes.json();
        console.log('💰 Markets data:', marketsData);
        setLiveMarkets(marketsData);
        setDataQuality(marketsData.data_quality || {});

        // Fetch news (medium refresh)
        const newsRes = await fetch(`${API_URL}/api/v1/news/financial`);
        const newsData = await newsRes.json();
        console.log('📰 News data:', newsData.news?.length, 'articles');
        setFinancialNews(newsData.news || []);

        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchAllData();
    
    // Smart refresh intervals
    const marketsInterval = setInterval(fetchAllData, 15000); // 15 seconds
    
    return () => {
      clearInterval(marketsInterval);
    };
  }, []);

  // Fetch weather (slow refresh)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const weatherRes = await fetch(`${API_URL}/api/v1/weather/global`);
        const weatherData = await weatherRes.json();
        setWeatherData(weatherData);
      } catch (error) {
        console.error('⚠️ Weather error:', error);
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 300000); // 5 minutes
    
    return () => clearInterval(weatherInterval);
  }, []);

  // Fetch economic calendar (very slow refresh)
  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const calendarRes = await fetch(`${API_URL}/api/v1/calendar/economic`);
        const calendarData = await calendarRes.json();
        setEconomicCalendar(calendarData);
      } catch (error) {
        console.error('⚠️ Calendar error:', error);
      }
    };

    fetchCalendar();
    const calendarInterval = setInterval(fetchCalendar, 3600000); // 1 hour
    
    return () => clearInterval(calendarInterval);
  }, []);

  const getMarkerColor = (sentiment) => {
    if (sentiment > 0.4) return '#10b981';
    if (sentiment > 0.2) return '#34d399';
    if (sentiment > 0) return '#facc15';
    if (sentiment > -0.2) return '#fb923c';
    if (sentiment > -0.4) return '#f87171';
    return '#ef4444';
  };

  const exportData = (format) => {
    if (format === 'csv') {
      const csv = [
        ['Asset', 'Value', 'Change', 'Status', 'Source', 'Age'].join(','),
        ...(liveMarkets?.equities || []).map(e => 
          [e.name, e.value, e.change, e.status, e.source, e.age_seconds].join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrld-vsn-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'json') {
      const json = JSON.stringify({ markets: liveMarkets, news: financialNews }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrld-vsn-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  const takeScreenshot = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const canvas = map.getCanvas();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrld-vsn-${new Date().toISOString()}.png`;
      a.click();
    }
  };

  if (loading) {
    return (
      <div style={{height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000'}}>
        <div style={{textAlign: 'center'}}>
          <Loader style={{width: '64px', height: '64px', color: '#3b82f6', margin: '0 auto 16px'}} className="animate-spin" />
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
          <p style={{color: '#9ca3af', marginBottom: '16px'}}>
            The REACT_APP_MAPBOX_TOKEN environment variable is not set.
          </p>
          <p style={{color: '#9ca3af', fontSize: '14px'}}>
            Add it in Vercel Settings → Environment Variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  console.log('🗺️ Rendering map with token');

  return (
    <div style={{height: '100vh', width: '100vw', position: 'relative', background: '#000', overflow: 'hidden', display: 'flex'}}>
      {/* Left Sidebar */}
      <div style={{width: '64px', background: '#030712', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px', zIndex: 30}}>
        <div style={{width: '44px', height: '44px', background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'}}>
          <Globe2 size={24} style={{color: '#fff'}} />
        </div>
        
        <div style={{width: '100%', height: '1px', background: '#1f2937', margin: '4px 0'}}></div>
        
        <button 
          onClick={toggleViewMode}
          style={{width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer'}}
          title={viewMode === 'globe' ? 'Flat Map' : 'Globe View'}
        >
          {viewMode === 'globe' ? <MapIcon size={20} /> : <Globe2 size={20} />}
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
              <div style={{width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'}}></div>
              <span style={{color: '#4ade80', fontWeight: '600', fontSize: '12px'}}>LIVE</span>
            </div>
          </div>
          
          <div style={{color: '#6b7280', fontFamily: 'monospace', fontSize: '14px'}}>
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        {/* Map + News Feed */}
        <div style={{flex: 1, display: 'flex', position: 'relative'}}>
          {/* MAP CONTAINER - EXPLICIT HEIGHT */}
          <div style={{flex: 1, position: 'relative', minHeight: 0}}>
            <Map
              ref={mapRef}
              {...viewport}
              onMove={evt => setViewport(evt.viewState)}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle={MAP_STYLES[mapStyle]}
              projection={viewMode === 'globe' ? 'globe' : 'mercator'}
              dragRotate={viewMode === 'globe'}
              touchZoomRotate={viewMode === 'globe'}
              attributionControl={false}
              maxZoom={18}
              minZoom={0.5}
              style={{width: '100%', height: '100%'}}
            >
              <NavigationControl position="top-right" showCompass={true} />
              <GeolocateControl position="top-right" />
              <ScaleControl position="bottom-right" />
            </Map>
          </div>

          {/* RIGHT SIDEBAR - NEWS FEED */}
          <div style={{width: '384px', background: 'rgba(17, 24, 39, 0.98)', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column'}}>
            <div style={{padding: '16px', borderBottom: '1px solid #1f2937'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{fontSize: '12px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.05em'}}>Live Intelligence Feed</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(6, 78, 59, 0.2)'}}>
                  <div style={{width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'}}></div>
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
                      height: '100%',
                      borderRadius: '9999px',
                      marginTop: '4px',
                      flexShrink: 0,
                      background: article.sentiment === 'bullish' ? '#22c55e' : article.sentiment === 'bearish' ? '#ef4444' : '#eab308'
                    }}></div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize: '12px', color: '#fff', lineHeight: '1.4', marginBottom: '8px'}}>
                        {article.title}
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span style={{color: '#6b7280'}}>{article.source}</span>
                          {article.city && (
                            <>
                              <span style={{color: '#374151'}}>•</span>
                              <span style={{color: '#60a5fa'}}>{article.city}</span>
                            </>
                          )}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
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
