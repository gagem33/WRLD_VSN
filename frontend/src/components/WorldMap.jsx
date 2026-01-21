import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Map from 'react-map-gl';
import { ScatterplotLayer } from 'deck.gl';
import DeckGL from '@deck.gl/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Zap, Globe, AlertTriangle } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

const WorldMap = () => {
  // FLAT 2D VIEW - No globe!
  const [viewport, setViewport] = useState({
    longitude: 15,
    latitude: 30,
    zoom: 1.5,
    pitch: 0,      // FLAT - no tilt
    bearing: 0,    // No rotation
    minZoom: 1,
    maxZoom: 12
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sentimentData, setSentimentData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        
        // Transform data to exact format needed
        const transformed = sentimentJson.map(item => ({
          coordinates: [item.coordinates.longitude, item.coordinates.latitude],
          sentiment: item.sentiment_score,
          intensity: item.intensity,
          location: item.location,
          source_count: item.source_count
        }));
        
        setSentimentData(transformed);

        const newsRes = await fetch(`${API_URL}/api/v1/news/breaking?limit=20`);
        const newsJson = await newsRes.json();
        setNewsData(newsJson);
        
        // Create live feed
        const feed = newsJson.slice(0, 10).map(item => ({
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

  // PRECISE SENTIMENT DOTS - Small, crisp circles
  const sentimentLayer = useMemo(() => new ScatterplotLayer({
    id: 'sentiment-dots',
    data: sentimentData,
    pickable: true,
    opacity: 0.95,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 4,    // Minimum size: 4 pixels
    radiusMaxPixels: 10,   // Maximum size: 10 pixels
    lineWidthMinPixels: 1,
    getPosition: d => d.coordinates,
    getRadius: d => 50000, // Base radius in meters
    getFillColor: d => {
      // Clean color coding by sentiment
      const score = d.sentiment;
      if (score > 0.4) return [34, 197, 94, 230];      // Bright green - very bullish
      if (score > 0.2) return [74, 222, 128, 200];     // Light green - bullish
      if (score > 0) return [253, 224, 71, 180];       // Yellow - slightly bullish
      if (score > -0.2) return [251, 146, 60, 180];    // Orange - slightly bearish
      if (score > -0.4) return [248, 113, 113, 200];   // Light red - bearish
      return [239, 68, 68, 230];                       // Bright red - very bearish
    },
    getLineColor: [255, 255, 255, 150], // White outline
    onClick: (info) => {
      if (info.object) {
        setSelectedLocation({
          type: 'sentiment',
          location: info.object.location,
          sentiment: info.object.sentiment,
          intensity: info.object.intensity,
          sources: info.object.source_count,
          coordinates: info.object.coordinates
        });
      }
    }
  }), [sentimentData]);

  // NEWS EVENT MARKERS - Separate, smaller dots
  const newsLayer = useMemo(() => new ScatterplotLayer({
    id: 'news-dots',
    data: newsData.filter(item => item.coordinates),
    pickable: true,
    opacity: 1,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 5,
    radiusMaxPixels: 12,
    lineWidthMinPixels: 2,
    getPosition: d => [d.coordinates.longitude, d.coordinates.latitude],
    getRadius: 40000,
    getFillColor: d => {
      if (d.urgency === 'high') return [239, 68, 68, 255];      // Red
      if (d.urgency === 'medium') return [251, 146, 60, 255];   // Orange
      return [59, 130, 246, 255];                               // Blue
    },
    getLineColor: [255, 255, 255, 255],
    onClick: (info) => {
      if (info.object) {
        setSelectedLocation({
          type: 'news',
          ...info.object
        });
      }
    }
  }), [newsData]);

  const layers = [sentimentLayer, newsLayer];

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Globe className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-xl">WRLD VSN</div>
          <div className="text-gray-500 text-sm mt-2">Loading intelligence network...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden">
      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-80 z-20 bg-gray-900/95 border-b border-gray-800 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Globe className="text-blue-500" size={18} />
              <span className="text-white font-bold text-lg tracking-tight">WRLD VSN</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <Activity size={14} className="text-blue-400" />
              <span className="text-gray-300">{sentimentData.length} Markets</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-gray-300">{newsData.length} Events</span>
            </div>
            <div className="text-gray-500 font-mono">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Main Map - FLAT 2D VIEW */}
      <div className="absolute top-12 left-0 right-80 bottom-0">
        <DeckGL
          viewState={viewport}
          controller={{
            dragPan: true,
            dragRotate: false,  // Disable rotation
            scrollZoom: true,
            touchZoom: true,
            touchRotate: false,  // Disable touch rotation
            keyboard: true,
            doubleClickZoom: true
          }}
          onViewStateChange={({ viewState }) => {
            // Force pitch to 0 (flat)
            setViewport({
              ...viewState,
              pitch: 0,
              bearing: 0
            });
          }}
          layers={layers}
        >
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: '100%', height: '100%' }}
          />
        </DeckGL>
      </div>

      {/* Right Panel - Live Feed */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gray-900/98 border-l border-gray-800 z-10 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="text-xs font-bold text-white tracking-wide">LIVE INTELLIGENCE</div>
          <div className="text-xs text-gray-500 mt-0.5">Real-time global events</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {liveFeed.map((item) => (
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

      {/* Bottom Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded px-4 py-2.5">
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

      {/* Location Detail Modal */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-w-[90vw] bg-gray-900/98 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl z-30"
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

      {/* Custom scrollbar styles */}
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
