import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl';
import { ScatterplotLayer } from 'deck.gl';
import DeckGL from '@deck.gl/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, Menu, X, Activity, Zap,
  TrendingUp, TrendingDown, Layers, Settings, Filter, Bell
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

const WorldMap = () => {
  const [viewMode, setViewMode] = useState('globe');
  const [menuOpen, setMenuOpen] = useState(false);
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
    sentiment: true,
    news: true
  });

  const toggleViewMode = () => {
    const newMode = viewMode === 'globe' ? 'flat' : 'globe';
    setViewMode(newMode);
    setViewport(prev => ({
      ...prev,
      pitch: newMode === 'flat' ? 0 : 45,
      zoom: newMode === 'flat' ? 1.5 : 2
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        
        const transformed = sentimentJson.map(item => ({
          position: [item.coordinates.longitude, item.coordinates.latitude],
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

  const sentimentLayer = useMemo(() => new ScatterplotLayer({
    id: 'sentiment',
    data: sentimentData,
    pickable: true,
    opacity: 0.9,
    filled: true,
    stroked: true,
    radiusMinPixels: 6,
    radiusMaxPixels: 15,
    lineWidthMinPixels: 1,
    getPosition: d => d.position,
    getRadius: 80000,
    radiusUnits: 'meters',
    getFillColor: d => {
      const s = d.sentiment;
      if (s > 0.3) return [34, 197, 94, 240];
      if (s > 0) return [253, 224, 71, 200];
      if (s > -0.3) return [251, 146, 60, 200];
      return [239, 68, 68, 240];
    },
    getLineColor: [255, 255, 255, 180],
    visible: layers.sentiment
  }), [sentimentData, layers.sentiment]);

  const newsLayer = useMemo(() => new ScatterplotLayer({
    id: 'news',
    data: newsData.filter(item => item.coordinates),
    pickable: true,
    opacity: 1,
    filled: true,
    stroked: true,
    radiusMinPixels: 7,
    radiusMaxPixels: 16,
    lineWidthMinPixels: 2,
    getPosition: d => [d.coordinates.longitude, d.coordinates.latitude],
    getRadius: 60000,
    radiusUnits: 'meters',
    getFillColor: d => {
      if (d.urgency === 'high') return [239, 68, 68, 255];
      if (d.urgency === 'medium') return [251, 146, 60, 255];
      return [59, 130, 246, 255];
    },
    getLineColor: [255, 255, 255, 255],
    visible: layers.news
  }), [newsData, layers.news]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Globe2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-xl font-bold">WRLD VSN</div>
          <div className="text-gray-500 text-sm mt-2">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex">
      {/* Left Sidebar */}
      <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 space-y-4 z-30">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
          <Globe2 size={24} className="text-white" />
        </div>
        
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          <Menu size={20} />
        </button>
        
        <button 
          onClick={toggleViewMode}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          {viewMode === 'globe' ? <MapIcon size={20} /> : <Globe2 size={20} />}
        </button>
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
          <Layers size={20} />
        </button>
        
        <div className="flex-1"></div>
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
          <Settings size={20} />
        </button>
      </div>

      {/* Menu Panel */}
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
              
              <div className="space-y-3 mb-6">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Data Layers</div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Market Sentiment</span>
                  <input
                    type="checkbox"
                    checked={layers.sentiment}
                    onChange={(e) => setLayers({ ...layers, sentiment: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Breaking News</span>
                  <input
                    type="checkbox"
                    checked={layers.news}
                    onChange={(e) => setLayers({ ...layers, news: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
              </div>
              
              <div className="space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">View Mode</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => viewMode !== 'globe' && toggleViewMode()}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      viewMode === 'globe' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    <Globe2 size={16} />
                    <span className="text-xs font-medium">Globe</span>
                  </button>
                  <button
                    onClick={() => viewMode !== 'flat' && toggleViewMode()}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      viewMode === 'flat' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    <MapIcon size={16} />
                    <span className="text-xs font-medium">Flat</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-gray-900/95 border-b border-gray-800 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-white font-bold text-lg">WRLD VSN</div>
              <div className="text-xs text-gray-500">Global Intelligence</div>
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

        {/* Map and Feed */}
        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <DeckGL
              viewState={viewport}
              controller={{
                dragRotate: viewMode === 'globe',
                touchRotate: viewMode === 'globe'
              }}
              onViewStateChange={({ viewState }) => setViewport(viewState)}
              layers={[sentimentLayer, newsLayer]}
            >
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                projection={viewMode === 'globe' ? 'globe' : 'mercator'}
              />
            </DeckGL>

            <div className="absolute bottom-6 left-6 bg-gray-900/95 border border-gray-800 rounded-lg px-4 py-3">
              <div className="text-[10px] text-gray-400 uppercase mb-2">Sentiment</div>
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

          {/* Live Feed */}
          <div className="w-80 bg-gray-900/98 border-l border-gray-800 flex flex-col">
            <div className="px-4 py-3.5 border-b border-gray-800">
              <div className="text-xs font-bold text-white">LIVE INTELLIGENCE</div>
              <div className="text-xs text-gray-500 mt-0.5">Real-time events</div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {liveFeed.map((item) => (
                <div key={item.id} className="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer">
                  <div className="flex items-start space-x-2.5">
                    <div className={`w-1 h-full rounded-full mt-1 ${
                      item.type === 'positive' ? 'bg-green-500' : 
                      item.type === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white leading-tight mb-1.5 line-clamp-2">
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{item.source}</span>
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
    </div>
  );
};

export default WorldMap;
