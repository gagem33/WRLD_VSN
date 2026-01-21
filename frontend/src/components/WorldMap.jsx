import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, PathLayer } from 'deck.gl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, Menu, X, Activity, Zap, TrendingUp, TrendingDown,
  Layers, Settings, Filter, Search, Ship, Plane, AlertCircle, DollarSign,
  Users, Shield, Navigation, BarChart3, Radio, Eye
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

const WorldMap = () => {
  const mapRef = useRef(null);
  const [viewMode, setViewMode] = useState('globe');
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 45,
    bearing: 0,
    minZoom: 1,
    maxZoom: 18
  });

  const [sentimentData, setSentimentData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);
  
  const [layers, setLayers] = useState({
    markets: true,
    events: true,
    conflicts: false,
    trade: false,
    connections: false
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        
        // CRITICAL: Geographic coordinates that stay pinned
        const transformed = sentimentJson.map(item => ({
          coordinates: [
            Number(item.coordinates.longitude), 
            Number(item.coordinates.latitude)
          ],
          sentiment: item.sentiment_score,
          location: item.location,
          source_count: item.source_count,
          intensity: item.intensity || 50
        }));
        
        console.log('📍 Markets loaded:', transformed.length);
        setSentimentData(transformed);

        const newsRes = await fetch(`${API_URL}/api/v1/news/breaking?limit=20`);
        const newsJson = await newsRes.json();
        setNewsData(newsJson);
        
        const feed = newsJson.slice(0, 15).map(item => ({
          id: item.id,
          type: item.sentiment === 'bullish' ? 'positive' : item.sentiment === 'bearish' ? 'negative' : 'neutral',
          title: item.title,
          source: item.source,
          timestamp: new Date(item.timestamp),
          urgency: item.urgency || 'medium'
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

  // MARKET SENTIMENT MARKERS - Pinned to geographic coordinates
  const marketMarkers = useMemo(() => new ScatterplotLayer({
    id: 'market-sentiment',
    data: sentimentData,
    
    // CRITICAL: Geographic coordinate system
    coordinateSystem: 1, // LNGLAT
    
    // Position returns [longitude, latitude]
    getPosition: d => d.coordinates,
    
    // Visual properties
    pickable: true,
    opacity: 0.95,
    filled: true,
    stroked: true,
    
    // CRITICAL: Geographic sizing so dots stay pinned
    radiusUnits: 'common',
    radiusScale: 50000,
    getRadius: d => d.intensity || 50,
    
    // Pixel constraints
    radiusMinPixels: 8,
    radiusMaxPixels: 22,
    
    // Outline
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 2,
    getLineWidth: 2,
    getLineColor: [255, 255, 255, 200],
    
    // Color by sentiment
    getFillColor: d => {
      const s = d.sentiment;
      if (s > 0.4) return [16, 185, 129, 255];     // Strong green
      if (s > 0.2) return [52, 211, 153, 230];     // Green
      if (s > 0) return [250, 204, 21, 210];       // Yellow
      if (s > -0.2) return [251, 146, 60, 210];    // Orange  
      if (s > -0.4) return [248, 113, 113, 230];   // Light red
      return [239, 68, 68, 255];                   // Strong red
    },
    
    // Click handler
    onClick: (info) => {
      if (info.object) {
        setSelectedMarker({
          type: 'market',
          ...info.object
        });
      }
    },
    
    // Update triggers
    updateTriggers: {
      getPosition: sentimentData,
      getFillColor: sentimentData
    },
    
    visible: layers.markets
  }), [sentimentData, layers.markets]);

  // PULSE RINGS for high-activity zones
  const pulseRings = useMemo(() => new ScatterplotLayer({
    id: 'activity-pulses',
    data: sentimentData.filter(d => Math.abs(d.sentiment) > 0.5),
    
    coordinateSystem: 1,
    getPosition: d => d.coordinates,
    
    pickable: false,
    opacity: 0.25,
    filled: false,
    stroked: true,
    
    radiusUnits: 'common',
    radiusScale: 70000,
    getRadius: d => (d.intensity || 50) * 1.4,
    
    radiusMinPixels: 16,
    radiusMaxPixels: 35,
    
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 2,
    getLineWidth: 2,
    getLineColor: d => d.sentiment > 0 ? [16, 185, 129, 120] : [239, 68, 68, 120],
    
    updateTriggers: {
      getPosition: sentimentData
    },
    
    visible: layers.markets
  }), [sentimentData, layers.markets]);

  // NEWS/EVENT MARKERS
  const eventMarkers = useMemo(() => new ScatterplotLayer({
    id: 'events',
    data: newsData.filter(item => item.coordinates),
    
    coordinateSystem: 1,
    getPosition: d => [Number(d.coordinates.longitude), Number(d.coordinates.latitude)],
    
    pickable: true,
    opacity: 1,
    filled: true,
    stroked: true,
    
    radiusUnits: 'common',
    radiusScale: 40000,
    getRadius: 60,
    
    radiusMinPixels: 9,
    radiusMaxPixels: 20,
    
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 2,
    getLineWidth: 2,
    getLineColor: [255, 255, 255, 255],
    
    getFillColor: d => {
      if (d.urgency === 'high') return [239, 68, 68, 255];
      if (d.urgency === 'medium') return [251, 146, 60, 255];
      return [59, 130, 246, 255];
    },
    
    onClick: (info) => {
      if (info.object) {
        setSelectedMarker({
          type: 'event',
          ...info.object
        });
      }
    },
    
    updateTriggers: {
      getPosition: newsData
    },
    
    visible: layers.events
  }), [newsData, layers.events]);

  // NETWORK CONNECTIONS between correlated markets
  const connectionArcs = useMemo(() => {
    if (!layers.connections || sentimentData.length < 2) return null;
    
    const connections = [];
    for (let i = 0; i < sentimentData.length; i++) {
      for (let j = i + 1; j < sentimentData.length; j++) {
        const diff = Math.abs(sentimentData[i].sentiment - sentimentData[j].sentiment);
        if (diff < 0.15) {
          connections.push({
            source: sentimentData[i].coordinates,
            target: sentimentData[j].coordinates,
            strength: 1 - diff
          });
        }
      }
    }
    
    return new ArcLayer({
      id: 'market-connections',
      data: connections.slice(0, 25),
      
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      
      getSourceColor: [59, 130, 246, 80],
      getTargetColor: [147, 51, 234, 80],
      
      getWidth: d => d.strength * 2,
      widthMinPixels: 1,
      widthMaxPixels: 3,
      
      greatCircle: true,
      
      visible: true
    });
  }, [sentimentData, layers.connections]);

  const deckLayers = [
    pulseRings,
    marketMarkers,
    eventMarkers,
    connectionArcs
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Globe2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-2xl font-bold mb-2">WRLD VSN</div>
          <div className="text-gray-500 text-sm">Loading global intelligence network...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex">
      {/* Left Sidebar */}
      <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 space-y-3 z-30">
        {/* Logo */}
        <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mb-2">
          <Globe2 size={24} className="text-white" />
        </div>
        
        <div className="w-full h-px bg-gray-800 my-1"></div>
        
        {/* Controls */}
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            menuOpen ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Control Panel"
        >
          <Menu size={20} />
        </button>
        
        <button 
          onClick={toggleViewMode}
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title={viewMode === 'globe' ? 'Flat Map' : 'Globe View'}
        >
          {viewMode === 'globe' ? <MapIcon size={20} /> : <Globe2 size={20} />}
        </button>
        
        <button 
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Data Layers"
        >
          <Layers size={20} />
        </button>
        
        <button 
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Search"
        >
          <Search size={20} />
        </button>
        
        <button 
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Filters"
        >
          <Filter size={20} />
        </button>
        
        <button 
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Analytics"
        >
          <BarChart3 size={20} />
        </button>
        
        <div className="flex-1"></div>
        
        <div className="w-full h-px bg-gray-800 my-1"></div>
        
        <button 
          className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Control Panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-16 top-0 bottom-0 w-72 bg-gray-900/98 backdrop-blur-xl border-r border-gray-800 z-20"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-bold text-lg">Control Panel</h2>
                  <div className="text-xs text-gray-500">Global Intelligence</div>
                </div>
                <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              {/* Data Layers */}
              <div className="space-y-3 mb-6">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Data Layers</div>
                
                {[
                  { key: 'markets', label: 'Market Sentiment', icon: TrendingUp, color: 'text-green-500' },
                  { key: 'events', label: 'Breaking Events', icon: AlertCircle, color: 'text-yellow-500' },
                  { key: 'conflicts', label: 'Conflicts & Tensions', icon: Shield, color: 'text-red-500' },
                  { key: 'trade', label: 'Trade Routes', icon: Ship, color: 'text-blue-500' },
                  { key: 'connections', label: 'Market Correlations', icon: Radio, color: 'text-purple-500' }
                ].map(({ key, label, icon: Icon, color }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all">
                    <div className="flex items-center space-x-3">
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
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Map Projection</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => viewMode !== 'globe' && toggleViewMode()}
                    className={`py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all font-medium text-xs ${
                      viewMode === 'globe' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    <Globe2 size={16} />
                    <span>Globe</span>
                  </button>
                  <button
                    onClick={() => viewMode !== 'flat' && toggleViewMode()}
                    className={`py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all font-medium text-xs ${
                      viewMode === 'flat' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    <MapIcon size={16} />
                    <span>Flat</span>
                  </button>
                </div>
              </div>
              
              {/* Live Statistics */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Live Statistics</div>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Markets Tracked</span>
                    <span className="text-white font-bold font-mono">{sentimentData.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Active Events</span>
                    <span className="text-white font-bold font-mono">{newsData.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Status</span>
                    <span className="text-green-500 font-semibold flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </span>
                  </div>
                </div>
              </div>
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
          {/* Map */}
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
                doubleClickZoom: true,
                inertia: true
              }}
              onViewStateChange={({ viewState }) => setViewport(viewState)}
              layers={deckLayers}
            >
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                projection={viewMode === 'globe' ? 'globe' : 'mercator'}
              />
            </DeckGL>

            {/* Legend */}
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

                {selectedMarker.coordinates && (
                  <div className="text-gray-600 text-xs font-mono">
                    {selectedMarker.coordinates[0].toFixed(4)}°, {selectedMarker.coordinates[1].toFixed(4)}°
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorldMap;
