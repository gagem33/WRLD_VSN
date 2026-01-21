import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, Menu, X, Activity, Zap, TrendingUp, TrendingDown,
  Layers, Settings, Filter, Search, AlertCircle, BarChart3, Radio, Satellite,
  Download, Clock, MapPin, Play, Pause, RefreshCw, Bell, Plus, Trash2,
  ChevronRight, Calendar, TrendingDown as Down, ArrowUp, ArrowDown,
  PieChart, BarChart, LineChart, Target, FileText, Image as ImageIcon
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

const WorldMap = () => {
  const mapRef = useRef(null);
  const [viewMode, setViewMode] = useState('globe');
  const [mapStyle, setMapStyle] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  // Panel states
  const [activePanel, setActivePanel] = useState(null); // 'search', 'analytics', 'timemachine', 'alerts', 'export'
  
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 45,
    bearing: 0
  });

  const [sentimentData, setSentimentData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);
  
  const [layers, setLayers] = useState({
    markets: true,
    events: true,
    connections: false
  });

  // TIER 1 FEATURE STATES
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Time Machine
  const [isTimeMachineActive, setIsTimeMachineActive] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0); // Hours ago
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Alerts
  const [alerts, setAlerts] = useState([
    // Example: { id: 1, location: 'New York', condition: 'below', threshold: -0.3, enabled: true }
  ]);
  const [newAlert, setNewAlert] = useState({ location: '', condition: 'above', threshold: 0.5 });
  
  // Analytics
  const [analytics, setAnalytics] = useState({
    avgSentiment: 0,
    bullishCount: 0,
    bearishCount: 0,
    topMovers: [],
    distribution: { veryBullish: 0, bullish: 0, neutral: 0, bearish: 0, veryBearish: 0 }
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time Machine auto-play
  useEffect(() => {
    if (isPlaying && isTimeMachineActive) {
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
  }, [isPlaying, isTimeMachineActive]);

  // Toggle view mode
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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        
        const transformed = sentimentJson.map(item => ({
          id: item.location.replace(/\s/g, '_'),
          longitude: Number(item.coordinates.longitude),
          latitude: Number(item.coordinates.latitude),
          sentiment: item.sentiment_score,
          location: item.location,
          source_count: item.source_count
        }));
        
        setSentimentData(transformed);

        const newsRes = await fetch(`${API_URL}/api/v1/news/breaking?limit=20`);
        const newsJson = await newsRes.json();
        setNewsData(newsJson);
        
        const feed = newsJson.slice(0, 15).map(item => ({
          id: item.id,
          type: item.sentiment === 'bullish' ? 'positive' : item.sentiment === 'bearish' ? 'negative' : 'neutral',
          title: item.title,
          source: item.source,
          timestamp: new Date(item.timestamp)
        }));
        setLiveFeed(feed);
        
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate analytics whenever sentiment data changes
  useEffect(() => {
    if (sentimentData.length > 0) {
      const avg = sentimentData.reduce((sum, city) => sum + city.sentiment, 0) / sentimentData.length;
      const bullish = sentimentData.filter(city => city.sentiment > 0).length;
      const bearish = sentimentData.filter(city => city.sentiment < 0).length;
      
      const sorted = [...sentimentData].sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment));
      const topMovers = sorted.slice(0, 5);
      
      const distribution = {
        veryBullish: sentimentData.filter(c => c.sentiment > 0.4).length,
        bullish: sentimentData.filter(c => c.sentiment > 0 && c.sentiment <= 0.4).length,
        neutral: sentimentData.filter(c => c.sentiment >= -0.2 && c.sentiment <= 0.2).length,
        bearish: sentimentData.filter(c => c.sentiment < 0 && c.sentiment >= -0.4).length,
        veryBearish: sentimentData.filter(c => c.sentiment < -0.4).length
      };
      
      setAnalytics({ avgSentiment: avg, bullishCount: bullish, bearishCount: bearish, topMovers, distribution });
    }
  }, [sentimentData]);

  // Search functionality
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

  // Fly to location
  const flyToLocation = (city) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [city.longitude, city.latitude],
        zoom: 8,
        duration: 2000,
        essential: true
      });
      setSelectedMarker({ type: 'market', ...city });
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Add alert
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

  // Check alerts
  useEffect(() => {
    alerts.forEach(alert => {
      const city = sentimentData.find(c => c.location.toLowerCase() === alert.location.toLowerCase());
      if (city && alert.enabled) {
        const shouldTrigger = alert.condition === 'above' 
          ? city.sentiment > alert.threshold 
          : city.sentiment < alert.threshold;
          
        if (shouldTrigger && !alert.triggered) {
          // Trigger alert
          console.log(`🔔 ALERT: ${city.location} sentiment ${alert.condition} ${alert.threshold}`);
          // Update alert as triggered
          setAlerts(prev => prev.map(a => 
            a.id === alert.id ? { ...a, triggered: true } : a
          ));
        }
      }
    });
  }, [sentimentData, alerts]);

  // Export data
  const exportData = (format) => {
    if (format === 'csv') {
      const csv = [
        ['Location', 'Latitude', 'Longitude', 'Sentiment', 'Sources'].join(','),
        ...sentimentData.map(city => 
          [city.location, city.latitude, city.longitude, city.sentiment, city.source_count].join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrld-vsn-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'json') {
      const json = JSON.stringify(sentimentData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrld-vsn-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  // Screenshot
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
          <div className="text-gray-500 text-sm">Initializing...</div>
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
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            menuOpen ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Menu size={20} />
        </button>
        
        <button 
          onClick={toggleViewMode}
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          {viewMode === 'globe' ? <MapIcon size={20} /> : <Globe2 size={20} />}
        </button>
        
        <button 
          onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : mapStyle === 'satellite' ? 'streets' : 'dark')}
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          <Satellite size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'search' ? null : 'search')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'search' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Search size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'analytics' ? null : 'analytics')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <BarChart3 size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'timemachine' ? null : 'timemachine')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'timemachine' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Clock size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'alerts' ? null : 'alerts')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'alerts' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Bell size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'export' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
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
                    <h2 className="text-white font-bold text-lg">Search</h2>
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
                          key={city.id}
                          onClick={() => flyToLocation(city)}
                          className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
                        >
                          <div className="flex items-center space-x-3">
                            <MapPin size={16} className="text-blue-400" />
                            <span className="text-white text-sm">{city.location}</span>
                          </div>
                          <div className={`text-xs font-semibold ${
                            city.sentiment > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(city.sentiment * 100).toFixed(0)}%
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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
                  
                  {/* Average Sentiment */}
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <div className="text-xs text-gray-400 mb-2">Global Avg Sentiment</div>
                    <div className={`text-3xl font-bold ${analytics.avgSentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(analytics.avgSentiment * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  {/* Bull/Bear Split */}
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
                  
                  {/* Distribution */}
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <div className="text-xs text-gray-400 mb-3">Distribution</div>
                    {Object.entries(analytics.distribution).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-xs text-white font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Top Movers */}
                  <div>
                    <div className="text-xs text-gray-400 mb-3">Top Movers</div>
                    <div className="space-y-2">
                      {analytics.topMovers.map((city, idx) => (
                        <div key={city.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                            <span className="text-xs text-white">{city.location}</span>
                          </div>
                          <span className={`text-xs font-bold ${city.sentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(city.sentiment * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TIME MACHINE PANEL */}
              {activePanel === 'timemachine' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Time Machine</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-300">Hours Ago</span>
                      <span className="text-lg font-mono text-white">{timeOffset.toFixed(1)}h</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="0.5"
                      value={timeOffset}
                      onChange={(e) => setTimeOffset(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex space-x-2 mb-4">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                      onClick={() => setTimeOffset(0)}
                      className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center">
                    {timeOffset === 0 ? 'Current Time' : `${new Date(Date.now() - timeOffset * 3600000).toLocaleString()}`}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-blue-300">
                      ℹ️ Time Machine replays historical sentiment data. Use the slider or play button to travel back in time.
                    </div>
                  </div>
                </>
              )}

              {/* ALERTS PANEL */}
              {activePanel === 'alerts' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Custom Alerts</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <div className="text-xs text-gray-400 mb-3">Create Alert</div>
                    <input
                      type="text"
                      placeholder="City name..."
                      value={newAlert.location}
                      onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded mb-2 text-sm"
                    />
                    <select
                      value={newAlert.condition}
                      onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded mb-2 text-sm"
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      min="-1"
                      max="1"
                      value={newAlert.threshold}
                      onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded mb-3 text-sm"
                    />
                    <button
                      onClick={addAlert}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
                    >
                      <Plus size={16} />
                      <span className="text-sm">Add Alert</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {alerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm text-white">{alert.location}</div>
                          <div className="text-xs text-gray-400">
                            {alert.condition} {(alert.threshold * 100).toFixed(0)}%
                          </div>
                        </div>
                        <button
                          onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
              <div className="text-xs text-gray-500">Global Intelligence Platform</div>
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
                <span className="text-gray-400">Events</span>
                <span className="text-white font-bold font-mono">{newsData.length}</span>
              </div>
            </div>
            <div className="text-gray-500 font-mono text-sm tabular-nums">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Map + Feed */}
        <div className="flex-1 flex">
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

              {layers.markets && sentimentData.map((city) => (
                <Marker
                  key={city.id}
                  longitude={city.longitude}
                  latitude={city.latitude}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedMarker({ type: 'market', ...city });
                  }}
                >
                  <div className="relative cursor-pointer group">
                    {Math.abs(city.sentiment) > 0.5 && (
                      <div 
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                          width: '32px',
                          height: '32px',
                          transform: 'translate(-50%, -50%)',
                          left: '50%',
                          top: '50%',
                          border: `2px solid ${getMarkerColor(city.sentiment)}40`,
                          boxShadow: `0 0 20px ${getMarkerColor(city.sentiment)}40`
                        }}
                      />
                    )}
                    
                    <div
                      className="rounded-full transition-all group-hover:scale-125"
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: getMarkerColor(city.sentiment),
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    />
                  </div>
                </Marker>
              ))}

              {layers.events && newsData.filter(item => item.coordinates).map((event) => (
                <Marker
                  key={event.id}
                  longitude={Number(event.coordinates.longitude)}
                  latitude={Number(event.coordinates.latitude)}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedMarker({ type: 'event', ...event });
                  }}
                >
                  <div
                    className="rounded-full cursor-pointer transition-all hover:scale-125"
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: event.urgency === 'high' ? '#ef4444' : event.urgency === 'medium' ? '#fb923c' : '#3b82f6',
                      border: '2px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                  />
                </Marker>
              ))}
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

          {/* Intelligence Feed */}
          <div className="w-80 bg-gray-900/98 border-l border-gray-800 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-800">
              <div className="text-xs font-bold text-white tracking-wide">Live Intelligence Feed</div>
              <div className="text-xs text-gray-500 mt-1">Real-time global events</div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {liveFeed.map((item) => (
                <div 
                  key={item.id}
                  className="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-1.5 h-full rounded-full mt-1 flex-shrink-0 ${
                      item.type === 'positive' ? 'bg-green-500' : 
                      item.type === 'negative' ? 'bg-red-500' : 
                      'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white leading-tight mb-2">
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{item.source}</span>
                        <span className="text-gray-600 font-mono text-[10px]">
                          {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMarker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-gray-900/98 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl z-40"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-white font-bold text-xl mb-2">
                    {selectedMarker.location || selectedMarker.title}
                  </div>
                  {selectedMarker.sentiment !== undefined && (
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-semibold ${
                      selectedMarker.sentiment > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {selectedMarker.sentiment > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>{(Math.abs(selectedMarker.sentiment) * 100).toFixed(1)}%</span>
                      <span className="text-xs">{selectedMarker.sentiment > 0 ? 'BULLISH' : 'BEARISH'}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {selectedMarker.source_count && (
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-400">Data Sources</span>
                    <span className="text-white font-bold font-mono">{selectedMarker.source_count}</span>
                  </div>
                )}
                
                {selectedMarker.source && (
                  <div className="text-gray-400 text-xs">
                    Source: <span className="text-gray-300">{selectedMarker.source}</span>
                  </div>
                )}

                <div className="text-gray-600 text-xs font-mono">
                  {selectedMarker.longitude?.toFixed(4)}°, {selectedMarker.latitude?.toFixed(4)}°
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorldMap;
