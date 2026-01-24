import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, Menu, X, Activity, Zap, TrendingUp, TrendingDown,
  Search, BarChart3, Download, Clock, Bell, Plus, Trash2, Settings,
  ChevronRight, FileText, Image as ImageIcon, ExternalLink, Satellite,
  Play, Pause, RefreshCw, MapPin, PieChart, DollarSign, AlertTriangle,
  Briefcase, Layers
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

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

const WorldMap = () => {
  const mapRef = useRef(null);
  const [viewMode, setViewMode] = useState('globe');
  const [mapStyle, setMapStyle] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState(null);
  
  const [activePanel, setActivePanel] = useState(null);
  
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 45,
    bearing: 0
  });

  const [sentimentData, setSentimentData] = useState([]);
  const [cityNewsCounts, setCityNewsCounts] = useState({});
  const [selectedCityNews, setSelectedCityNews] = useState([]);
  const [globalMarkets, setGlobalMarkets] = useState(null);
  const [keyIndicators, setKeyIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [timeOffset, setTimeOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [alerts, setAlerts] = useState([]);
  const [newAlert, setNewAlert] = useState({ location: '', condition: 'above', threshold: 0.5 });
  
  const [analytics, setAnalytics] = useState({
    avgSentiment: 0,
    bullishCount: 0,
    bearishCount: 0,
    topMovers: [],
    distribution: {}
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time Machine
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setTimeOffset(prev => {
          if (prev >= 24) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

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

  // Fetch comprehensive data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sentiment
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        setSentimentData(sentimentJson);

        // City news counts
        const countsRes = await fetch(`${API_URL}/api/v1/news/city-counts`);
        const countsJson = await countsRes.json();
        setCityNewsCounts(countsJson);

        // Global markets
        const marketsRes = await fetch(`${API_URL}/api/v1/markets/global`);
        const marketsJson = await marketsRes.json();
        setGlobalMarkets(marketsJson.markets);

        // Key indicators
        const indicatorsRes = await fetch(`${API_URL}/api/v1/indicators/key`);
        const indicatorsJson = await indicatorsRes.json();
        setKeyIndicators(indicatorsJson.indicators);
        
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Every 2 min
    return () => clearInterval(interval);
  }, []);

  // Calculate analytics
  useEffect(() => {
    if (sentimentData.length > 0) {
      const avg = sentimentData.reduce((sum, city) => sum + city.sentiment_score, 0) / sentimentData.length;
      const bullish = sentimentData.filter(city => city.sentiment_score > 0).length;
      const bearish = sentimentData.filter(city => city.sentiment_score < 0).length;
      
      const sorted = [...sentimentData].sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score));
      const topMovers = sorted.slice(0, 5);
      
      const distribution = {
        veryBullish: sentimentData.filter(c => c.sentiment_score > 0.4).length,
        bullish: sentimentData.filter(c => c.sentiment_score > 0 && c.sentiment_score <= 0.4).length,
        neutral: sentimentData.filter(c => c.sentiment_score >= -0.2 && c.sentiment_score <= 0.2).length,
        bearish: sentimentData.filter(c => c.sentiment_score < 0 && c.sentiment_score >= -0.4).length,
        veryBearish: sentimentData.filter(c => c.sentiment_score < -0.4).length
      };
      
      setAnalytics({ avgSentiment: avg, bullishCount: bullish, bearishCount: bearish, topMovers, distribution });
    }
  }, [sentimentData]);

  // Search
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 1) {
      const results = sentimentData.filter(city => 
        city.location.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // Fly to location and load city news
  const flyToCity = async (city) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [city.coordinates.longitude, city.coordinates.latitude],
        zoom: 8,
        duration: 2000,
        essential: true
      });
      
      // Load city news
      try {
        const res = await fetch(`${API_URL}/api/v1/news/by-city/${city.location}`);
        const data = await res.json();
        setSelectedCityNews(data.news || []);
        setSelectedCity(city);
        setActivePanel('citynews');
      } catch (error) {
        console.error('Error loading city news:', error);
      }
      
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const addAlert = () => {
    if (newAlert.location) {
      setAlerts([...alerts, { 
        id: Date.now(), 
        ...newAlert, 
        enabled: true,
        triggered: false
      }]);
      setNewAlert({ location: '', condition: 'above', threshold: 0.5 });
    }
  };

  const exportData = (format) => {
    if (format === 'csv') {
      const csv = [
        ['Location', 'Latitude', 'Longitude', 'Sentiment', 'News Count'].join(','),
        ...sentimentData.map(city => 
          [city.location, city.coordinates.latitude, city.coordinates.longitude, city.sentiment_score, cityNewsCounts[city.location] || 0].join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrld-vsn-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'json') {
      const json = JSON.stringify({ sentiment: sentimentData, newsCounts: cityNewsCounts, markets: globalMarkets }, null, 2);
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

  const getMarkerColor = (sentiment) => {
    if (sentiment > 0.4) return '#10b981';
    if (sentiment > 0.2) return '#34d399';
    if (sentiment > 0) return '#facc15';
    if (sentiment > -0.2) return '#fb923c';
    if (sentiment > -0.4) return '#f87171';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Globe2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-2xl font-bold mb-2">WRLD VSN</div>
          <div className="text-gray-500 text-sm">Loading financial intelligence...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex">
      {/* Left Sidebar */}
      <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 space-y-3 z-30">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mb-2">
          <Globe2 size={24} className="text-white" />
        </div>
        
        <div className="w-full h-px bg-gray-800 my-1"></div>
        
        <button 
          onClick={toggleViewMode}
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title={viewMode === 'globe' ? 'Flat Map' : 'Globe View'}
        >
          {viewMode === 'globe' ? <MapIcon size={20} /> : <Globe2 size={20} />}
        </button>
        
        <button 
          onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : mapStyle === 'satellite' ? 'streets' : 'dark')}
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Toggle Map Style"
        >
          <Satellite size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'search' ? null : 'search')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'search' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Search"
        >
          <Search size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'markets' ? null : 'markets')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'markets' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Global Markets"
        >
          <DollarSign size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'indicators' ? null : 'indicators')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'indicators' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Key Indicators"
        >
          <Activity size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'analytics' ? null : 'analytics')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Analytics"
        >
          <BarChart3 size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'export' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Export"
        >
          <Download size={20} />
        </button>
        
        <div className="flex-1"></div>
        
        <div className="w-full h-px bg-gray-800 my-1"></div>
        
        <button className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
          <Settings size={20} />
        </button>
      </div>

      {/* Feature Panels */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-16 top-0 bottom-0 w-80 bg-gray-900/98 backdrop-blur-xl border-r border-gray-800 z-20 overflow-y-auto"
          >
            <div className="p-4">
              {/* SEARCH PANEL */}
              {activePanel === 'search' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Search Cities</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search cities..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map(city => (
                        <button
                          key={city.location}
                          onClick={() => flyToCity(city)}
                          className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
                        >
                          <div className="flex items-center space-x-3">
                            <MapPin size={16} className="text-blue-400" />
                            <div className="text-left">
                              <div className="text-white text-sm">{city.location}</div>
                              {cityNewsCounts[city.location] && (
                                <div className="text-xs text-gray-400">{cityNewsCounts[city.location]} articles</div>
                              )}
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${
                            city.sentiment_score > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(city.sentiment_score * 100).toFixed(0)}%
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* GLOBAL MARKETS PANEL */}
              {activePanel === 'markets' && globalMarkets && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Global Markets</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Equities */}
                  {globalMarkets.equities && globalMarkets.equities.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Equities</div>
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                        {globalMarkets.equities.map((equity, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-white">{equity.name}</span>
                            <div className="text-right">
                              <div className="text-sm text-white font-mono">{equity.value.toFixed(2)}</div>
                              <div className={`text-xs font-semibold ${equity.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {equity.change > 0 ? '+' : ''}{equity.change.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Crypto */}
                  {globalMarkets.crypto && globalMarkets.crypto.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Cryptocurrency</div>
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                        {globalMarkets.crypto.map((coin, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-white">{coin.name}</span>
                            <div className="text-right">
                              <div className="text-sm text-white font-mono">${coin.value.toLocaleString()}</div>
                              <div className={`text-xs font-semibold ${coin.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {coin.change > 0 ? '+' : ''}{coin.change.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commodities */}
                  {globalMarkets.commodities && globalMarkets.commodities.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Commodities</div>
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                        {globalMarkets.commodities.map((commodity, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-white">{commodity.name}</span>
                            <div className="text-right">
                              <div className="text-sm text-white font-mono">${commodity.value.toFixed(2)}</div>
                              <div className={`text-xs font-semibold ${commodity.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {commodity.change > 0 ? '+' : ''}{commodity.change.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Currencies */}
                  {globalMarkets.currencies && globalMarkets.currencies.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Currencies</div>
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                        {globalMarkets.currencies.map((currency, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-white">{currency.name}</span>
                            <div className="text-right">
                              <div className="text-sm text-white font-mono">{currency.value.toFixed(4)}</div>
                              <div className={`text-xs font-semibold ${currency.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {currency.change > 0 ? '+' : ''}{currency.change.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* KEY INDICATORS PANEL */}
              {activePanel === 'indicators' && keyIndicators && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Key Indicators</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(keyIndicators).map(([key, indicator]) => (
                      <div key={key} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-gray-400 uppercase">{indicator.description}</div>
                          <div className={`text-xs font-bold px-2 py-1 rounded ${
                            indicator.status.includes('LOW') || indicator.status.includes('BULLISH') || indicator.status.includes('RISK-ON') || indicator.status === 'GREED'
                              ? 'bg-green-900/30 text-green-400'
                              : indicator.status.includes('HIGH') || indicator.status.includes('BEARISH')
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-yellow-900/30 text-yellow-400'
                          }`}>
                            {indicator.status}
                          </div>
                        </div>
                        <div className="flex items-baseline space-x-2">
                          <div className="text-2xl font-bold text-white">{indicator.value}</div>
                          {indicator.change !== undefined && (
                            <div className={`text-sm font-semibold ${indicator.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {indicator.change > 0 ? '▲' : '▼'} {Math.abs(indicator.change)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ANALYTICS PANEL */}
              {activePanel === 'analytics' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Analytics</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <div className="text-xs text-gray-400 mb-2">Global Avg Sentiment</div>
                    <div className={`text-3xl font-bold ${analytics.avgSentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(analytics.avgSentiment * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp size={14} className="text-green-400" />
                        <span className="text-xs text-gray-400">Bullish</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400">{analytics.bullishCount}</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingDown size={14} className="text-red-400" />
                        <span className="text-xs text-gray-400">Bearish</span>
                      </div>
                      <div className="text-2xl font-bold text-red-400">{analytics.bearishCount}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-400 mb-3">Top Movers</div>
                    <div className="space-y-2">
                      {analytics.topMovers.map((city, idx) => (
                        <div key={city.location} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                            <span className="text-xs text-white">{city.location}</span>
                          </div>
                          <span className={`text-xs font-bold ${city.sentiment_score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(city.sentiment_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* CITY NEWS PANEL */}
              {activePanel === 'citynews' && selectedCity && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-white font-bold text-lg">{selectedCity.location}</h2>
                      <div className="text-xs text-gray-500">{selectedCityNews.length} articles</div>
                    </div>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedCityNews.map((article) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
                      >
                        <div className="text-sm text-white leading-tight mb-2 group-hover:text-blue-300 transition-colors">
                          {article.title}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{article.source}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">{getRelativeTime(article.timestamp)}</span>
                            <ExternalLink size={10} className="text-gray-600 group-hover:text-blue-400" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* EXPORT PANEL */}
              {activePanel === 'export' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Export Data</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => exportData('csv')}
                      className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText size={20} className="text-green-400" />
                        <div className="text-left">
                          <div className="text-white text-sm font-medium">Export CSV</div>
                          <div className="text-gray-400 text-xs">Spreadsheet format</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white" />
                    </button>
                    
                    <button
                      onClick={() => exportData('json')}
                      className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText size={20} className="text-blue-400" />
                        <div className="text-left">
                          <div className="text-white text-sm font-medium">Export JSON</div>
                          <div className="text-gray-400 text-xs">Developer format</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white" />
                    </button>
                    
                    <button
                      onClick={takeScreenshot}
                      className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <ImageIcon size={20} className="text-purple-400" />
                        <div className="text-left">
                          <div className="text-white text-sm font-medium">Screenshot</div>
                          <div className="text-gray-400 text-xs">PNG image</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-16 bg-gray-900/95 border-b border-gray-800 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-8">
            <div>
              <div className="text-white font-bold text-xl">WRLD VSN</div>
              <div className="text-xs text-gray-500">Financial Intelligence Platform</div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-500/30">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold text-xs">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <Activity size={14} className="text-blue-400" />
                <span className="text-gray-400">Markets</span>
                <span className="text-white font-bold font-mono">{sentimentData.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-gray-400">News</span>
                <span className="text-white font-bold font-mono">{Object.values(cityNewsCounts).reduce((a, b) => a + b, 0)}</span>
              </div>
            </div>
            <div className="text-gray-500 font-mono text-sm tabular-nums">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
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
          >
            <NavigationControl position="top-right" showCompass={true} />
            <GeolocateControl position="top-right" />
            <ScaleControl position="bottom-right" />

            {sentimentData.map((city) => {
              const newsCount = cityNewsCounts[city.location] || 0;
              return (
                <Marker
                  key={city.location}
                  longitude={city.coordinates.longitude}
                  latitude={city.coordinates.latitude}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    flyToCity(city);
                  }}
                >
                  <div className="relative cursor-pointer group">
                    {Math.abs(city.sentiment_score) > 0.5 && (
                      <div 
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                          width: '32px',
                          height: '32px',
                          transform: 'translate(-50%, -50%)',
                          left: '50%',
                          top: '50%',
                          border: `2px solid ${getMarkerColor(city.sentiment_score)}40`,
                          boxShadow: `0 0 20px ${getMarkerColor(city.sentiment_score)}40`
                        }}
                      />
                    )}
                    
                    <div
                      className="rounded-full transition-all group-hover:scale-125 relative"
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: getMarkerColor(city.sentiment_score),
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      {newsCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {newsCount > 9 ? '9+' : newsCount}
                        </div>
                      )}
                    </div>

                    <div className="absolute left-6 top-0 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-gray-900/95 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700">
                        <div className="font-bold">{city.location}</div>
                        <div className="text-gray-400">{newsCount} articles</div>
                      </div>
                    </div>
                  </div>
                </Marker>
              );
            })}
          </Map>

          <div className="absolute bottom-6 left-6 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Market Sentiment</div>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Bullish</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-300">Neutral</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-300">Bearish</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
