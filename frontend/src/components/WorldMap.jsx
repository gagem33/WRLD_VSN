import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Map from 'react-map-gl';
import { ScatterplotLayer, IconLayer, ArcLayer } from 'deck.gl';
import DeckGL from '@deck.gl/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Zap, Users, DollarSign, Globe } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

const WorldMap = () => {
  const [viewport, setViewport] = useState({
    longitude: 15,
    latitude: 30,
    zoom: 2,
    pitch: 0,  // Flat view
    bearing: 0
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sentimentData, setSentimentData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);

  // Layer visibility toggles
  const [layers, setLayers] = useState({
    sentiment: true,
    news: true,
    markets: true,
    conflicts: true
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        
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
        
        // Create live feed from news
        const feed = newsJson.map(item => ({
          id: item.id,
          type: item.sentiment === 'bullish' ? 'positive' : item.sentiment === 'bearish' ? 'negative' : 'neutral',
          title: item.title,
          source: item.source,
          timestamp: new Date(item.timestamp),
          location: 'Global'
        }));
        setLiveFeed(feed);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Sentiment dots - small, crisp circles
  const sentimentLayer = useMemo(() => new ScatterplotLayer({
    id: 'sentiment-dots',
    data: sentimentData,
    getPosition: d => d.coordinates,
    getFillColor: d => {
      // Color based on sentiment
      if (d.sentiment > 0.3) return [67, 160, 71, 200];      // Green - bullish
      if (d.sentiment > 0) return [129, 199, 132, 180];      // Light green
      if (d.sentiment > -0.3) return [255, 167, 38, 180];    // Orange - neutral/caution
      return [229, 57, 53, 200];                             // Red - bearish
    },
    getRadius: 30000,  // Much smaller, precise dots
    radiusMinPixels: 3,
    radiusMaxPixels: 8,
    pickable: true,
    onClick: (info) => {
      if (info.object) {
        setSelectedLocation({
          type: 'sentiment',
          location: info.object.location,
          sentiment: info.object.sentiment,
          coordinates: info.object.coordinates,
          sources: info.object.source_count
        });
      }
    },
    visible: layers.sentiment,
    opacity: 0.9
  }), [sentimentData, layers.sentiment]);

  // News events - precise markers
  const newsLayer = useMemo(() => new ScatterplotLayer({
    id: 'news-markers',
    data: newsData,
    getPosition: d => [d.coordinates.longitude, d.coordinates.latitude],
    getFillColor: d => {
      if (d.urgency === 'high') return [239, 68, 68, 255];     // Bright red
      if (d.urgency === 'medium') return [251, 146, 60, 255];  // Orange
      return [59, 130, 246, 255];                              // Blue
    },
    getRadius: 25000,
    radiusMinPixels: 4,
    radiusMaxPixels: 10,
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    onClick: (info) => setSelectedLocation(info.object),
    visible: layers.news
  }), [newsData, layers.news]);

  const allLayers = [sentimentLayer, newsLayer];

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-2">WRLD VSN</div>
          <div className="text-sm text-gray-500">Initializing global intelligence network...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden">
      {/* Top Bar - Bloomberg Style */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gray-900/95 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Globe className="text-blue-500" size={20} />
              <span className="text-white font-bold text-lg">WRLD VSN</span>
            </div>
            <div className="flex items-center space-x-1 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2">
              <Activity size={14} className="text-blue-400" />
              <span className="text-gray-400">{sentimentData.length} Markets</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-gray-400">{newsData.length} Events</span>
            </div>
            <div className="text-gray-500">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Layer Controls - Compact */}
      <div className="absolute top-16 left-4 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded">
        <div className="p-2 space-y-1 text-xs">
          {[
            { key: 'sentiment', label: 'Sentiment', icon: TrendingUp },
            { key: 'news', label: 'News', icon: AlertTriangle },
            { key: 'markets', label: 'Markets', icon: DollarSign },
            { key: 'conflicts', label: 'Conflicts', icon: Users }
          ].map(({ key, label, icon: Icon }) => (
            <label key={key} className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                className="w-3 h-3"
              />
              <Icon size={12} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main Map - Flat 2D */}
      <DeckGL
        viewState={viewport}
        controller={true}
        onViewStateChange={({ viewState }) => setViewport(viewState)}
        layers={allLayers}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      {/* Right Panel - Live Feed */}
      <div className="absolute top-16 right-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 z-10 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <div className="text-xs font-semibold text-white">LIVE INTELLIGENCE FEED</div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {liveFeed.map((item) => (
            <div key={item.id} className="p-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors">
              <div className="flex items-start space-x-2">
                <div className={`w-1 h-full rounded-full mt-1 ${
                  item.type === 'positive' ? 'bg-green-500' : 
                  item.type === 'negative' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium mb-1 line-clamp-2">
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{item.source}</span>
                    <span className="text-gray-600">{item.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Info Panel - Sentiment Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded px-4 py-2">
        <div className="text-xs text-gray-400 mb-1">Market Sentiment</div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-300">Bullish</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-gray-300">Neutral</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-gray-300">Bearish</span>
          </div>
        </div>
      </div>

      {/* Location Detail Modal - When Clicked */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-gray-900/98 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl z-30"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-white font-bold text-lg">
                    {selectedLocation.location || selectedLocation.title}
                  </div>
                  {selectedLocation.type === 'sentiment' && (
                    <div className={`text-xs mt-1 ${
                      selectedLocation.sentiment > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedLocation.sentiment > 0 ? '↑' : '↓'} 
                      {' '}{(Math.abs(selectedLocation.sentiment) * 100).toFixed(1)}% 
                      {' '}{selectedLocation.sentiment > 0 ? 'BULLISH' : 'BEARISH'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {selectedLocation.summary && (
                  <div className="text-gray-300">{selectedLocation.summary}</div>
                )}
                {selectedLocation.sources && (
                  <div className="text-gray-500">{selectedLocation.sources} sources</div>
                )}
                {selectedLocation.source && (
                  <div className="text-gray-500">Source: {selectedLocation.source}</div>
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
