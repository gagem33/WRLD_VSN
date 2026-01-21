import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Map from 'react-map-gl';
import { ScatterplotLayer } from 'deck.gl';
import DeckGL from '@deck.gl/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Activity, Zap, Globe2, Map as MapIcon,
  Settings, Layers, Filter, Download, Bell, Search, X, Menu,
  AlertTriangle, DollarSign, Users, BarChart3
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

const WorldMap = () => {
  const mapRef = useRef(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState('globe'); // 'globe' or 'flat'
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Viewport state - changes based on view mode
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 45,
    bearing: 0,
    minZoom: 1,
    maxZoom: 12
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sentimentData, setSentimentData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);
  
  // Layer toggles
  const [layers, setLayers] = useState({
    sentiment: true,
    news: true,
    markets: false,
    conflicts: false
  });

  // Toggle between flat and globe view
  const toggleViewMode = () => {
    const newMode = viewMode === 'globe' ? 'flat' : 'globe';
    setViewMode(newMode);
    
    if (newMode === 'flat') {
      // Switch to flat view
      setViewport(prev => ({
        ...prev,
        pitch: 0,
        bearing: 0,
        zoom: 1.5
      }));
      
      // Set Mapbox projection to flat
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        if (map) {
          map.setProjection('mercator');
        }
      }
    } else {
      // Switch to globe view
      setViewport(prev => ({
        ...prev,
        pitch: 45,
        zoom: 2
      }));
      
      // Set Mapbox projection to globe
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        if (map) {
          map.setProjection('globe');
        }
      }
    }
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        
        const transformed = sentimentJson.map(item => ({
          position: [item.coordinates.longitude, item.coordinates.latitude],
          sentiment: item.sentiment_score,
          intensity: item.intensity,
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
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // PRECISE SENTIMENT DOTS - Always pinned to cities
  const sentimentLayer = useMemo(() => new ScatterplotLayer({
    id: 'sentiment-dots',
    data: sentimentData,
    pickable: true,
    opacity: 0.9,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    lineWidthMinPixels: 1,
    getPosition: d => d.position,
    getRadius: 70000,
    getFillColor: d => {
      const score = d.sentiment;
      if (score > 0.4) return [34, 197, 94, 240];
      if (score > 0.2) return [74, 222, 128, 210];
      if (score > 0) return [253, 224, 71, 190];
      if (score > -0.2) return [251, 146, 60, 190];
      if (score > -0.4) return [248, 113, 113, 210];
      return [239, 68, 68, 240];
    },
    getLineColor: [255, 255, 255, 160],
    onClick: (info) => {
      if (info.object) {
        setSelectedLocation({
          type: 'sentiment',
          location: info.object.location,
          sentiment: info.object.sentiment,
          intensity: info.object.intensity,
          sources: info.object.source_count,
          coordinates: info.object.position
        });
      }
    },
    visible: layers.sentiment,
    radiusUnits: 'meters',
    updateTriggers: {
      getPosition: sentimentData,
      getFillColor: sentimentData
    }
  }), [sentimentData, layers.sentiment]);

  // NEWS DOTS
  const newsLayer = useMemo(() => new ScatterplotLayer({
    id: 'news-dots',
    data: newsData.filter(item => item.coordinates),
    pickable: true,
    opacity: 1,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 6,
    radiusMaxPixels: 14,
    lineWidthMinPixels: 2,
    getPosition: d => [d.coordinates.longitude, d.coordinates.latitude],
    getRadius: 50000,
    getFillColor: d => {
      if (d.urgency === 'high') return [239, 68, 68, 255];
      if (d.urgency === 'medium') return [251, 146, 60, 255];
      return [59, 130, 246, 255];
    },
    getLineColor: [255, 255, 255, 255],
    onClick: (info) => {
      if (info.object) {
        setSelectedLocation({
          type: 'news',
          ...info.object
        });
      }
    },
    visible: layers.news,
    radiusUnits: 'meters'
  }), [newsData, layers.news]);

  const deckLayers = [sentimentLayer, newsLayer];

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Globe2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-xl font-bold">WRLD VSN</div>
          <div className="text-gray-500 text-sm mt-2">Initializing global intelligence...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex">
      {/* Left Sidebar - Menu */}
      <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 space-y-4 z-30">
        {/* Logo */}
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
          <Globe2 size={24} className="text-white" />
        </div>
        
        {/* Menu Items */}
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Menu"
        >
          <Menu size={20} />
        </button>
        
        <button 
          onClick={toggleViewMode}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title={viewMode === 'globe' ? 'Switch to Flat' : 'Switch to Globe'}
        >
          {viewMode === 'globe' ? <MapIcon size={20} /> : <Globe2 size={20} />}
        </button>
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white" title="Layers">
          <Layers size={20} />
        </button>
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white" title="Filter">
          <Filter size={20} />
        </button>
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white" title="Alerts">
          <Bell size={20} />
        </button>
        
        <div className="flex-1"></div>
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white" title="Settings">
          <Settings size={20} />
        </button>
      </div>

      {/* Expandable Menu Panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="absolute left-16 top-0 bottom-0 w-64 bg-gray-900/98 backdrop-blur-md border-r border-gray-800 z-20"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-lg">Controls</h2>
                <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              {/* Layer Toggles */}
              <div className="space-y-3 mb-6">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Data Layers</div>
                
                {[
                  { key: 'sentiment', label: 'Market Sentiment', icon: TrendingUp, color: 'text-green-500' },
                  { key: 'news', label: 'Breaking News', icon: AlertTriangle, color: 'text-yellow-500' },
                  { key: 'markets', label: 'Stock Markets', icon: DollarSign, color: 'text-blue-500' },
                  { key: 'conflicts', label: 'Conflicts', icon: Users, color: 'text-red-500' }
                ].map(({ key, label, icon: Icon, color }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center space-x-2">
                      <Icon size={16} className={color} />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers[key]}
                      onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                  </label>
                ))}
              </div>
              
              {/* View Mode */}
              <div className="space-y-3 mb-6">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">View Mode</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => viewMode !== 'globe' && toggleViewMode()}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      viewMode === 'globe' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Globe2 size={16} />
                    <span className="text-xs font-medium">Globe</span>
                  </button>
                  <button
                    onClick={() => viewMode !== 'flat' && toggleViewMode()}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      viewMode === 'flat' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <MapIcon size={16} />
                    <span className="text-xs font-medium">Flat</span>
                  </button>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Statistics</div>
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Markets Tracked</span>
                    <span className="text-white font-semibold">{sentimentData.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Active Events</span>
                    <span className="text-white font-semibold">{newsData.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Data Sources</span>
                    <span className="text-white font-semibold">
                      {sentimentData.reduce((sum, item) => sum + item.source_count, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-gray-900/95 border-b border-gray-800 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-white font-bold text-lg tracking-tight">WRLD VSN</div>
              <div className="text-xs text-gray-500">Global Intelligence Platform</div>
            </div>
            <div className="flex items-center space-x-1.5 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <Activity size={14} className="text-blue-400" />
                <span className="text-gray-300">{sentimentData.length} Markets</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-gray-300">{newsData.length} Events</span>
              </div>
            </div>
            <div className="text-gray-500 font-mono text-xs">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Map and Feed Container */}
        <div className="flex-1 flex">
          {/* Map Area */}
          <div className="flex-1 relative">
            <DeckGL
              ref={mapRef}
              viewState={viewport}
              controller={{
                dragPan: true,
                dragRotate: viewMode === 'globe',
                scrollZoom: true,
                touchZoom: true,
                touchRotate: viewMode === 'globe',
                keyboard: true,
                doubleClickZoom: true
              }}
              onViewStateChange={({ viewState }) => {
                setViewport(viewState);
              }}
              layers={deckLayers}
            >
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                projection={viewMode === 'globe' ? 'globe' : 'mercator'}
                style={{ width: '100%', height: '100%' }}
              />
            </DeckGL>

            {/* Legend - Bottom Left */}
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

          {/* Right Panel - Live Feed */}
          <div className="w-80 bg-gray-900/98 border-l border-gray-800 flex flex-col">
            <div className="px-4 py-3.5 border-b border-gray-800">
              <div className="text-xs font-bold text-white tracking-wide">LIVE INTELLIGENCE</div>
              <div className="text-xs text-gray-500 mt-0.5">Real-time global events</div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {liveFeed.map((item, idx) => (
                <div 
                  key={item.id}
                  className="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-all"
                >
                  <div className="flex items-start space-x-2.5">
                    <div className={`w-1 h-full rounded-full mt-1 flex-shrink-0 ${
                      item.type === 'positive' ? 'bg-green-500' : 
                      item.type === 'negative' ? 'bg-red-500' : 
                      'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white leading-tight mb-1.5 line-clamp-2">
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">{item.source}</span>
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

      {/* Location Detail Modal */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-w-[90vw] bg-gray-900/98 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl z-40"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-white font-bold text-xl mb-1">
                    {selectedLocation.location || selectedLocation.title}
                  </div>
                  {selectedLocation.type === 'sentiment' && (
                    <div className={`inline-flex items-center space-x-1 text-sm font-semibold ${
                      selectedLocation.sentiment > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedLocation.sentiment > 0 ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}
                      <span>
                        {(Math.abs(selectedLocation.sentiment) * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        {selectedLocation.sentiment > 0 ? 'BULLISH' : 'BEARISH'}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {selectedLocation.summary && (
                  <div className="text-gray-300 leading-relaxed">
                    {selectedLocation.summary}
                  </div>
                )}
                
                {selectedLocation.sources && (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Activity size={14} />
                    <span>{selectedLocation.sources} data sources</span>
                  </div>
                )}
                
                {selectedLocation.source && (
                  <div className="text-gray-500">
                    Source: <span className="text-gray-400">{selectedLocation.source}</span>
                  </div>
                )}

                {selectedLocation.timestamp && (
                  <div className="text-gray-600 text-xs font-mono">
                    {new Date(selectedLocation.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4B5563;
        }
      `}</style>
    </div>
  );
};

export default WorldMap;
