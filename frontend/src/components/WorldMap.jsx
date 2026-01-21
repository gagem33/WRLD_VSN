import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Map from 'react-map-gl';
import { HeatmapLayer, IconLayer } from 'deck.gl';
import DeckGL from '@deck.gl/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, Activity } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

const WorldMap = () => {
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sentimentLayer, setSentimentLayer] = useState(true);
  const [newsLayer, setNewsLayer] = useState(true);
  const [sentimentData, setSentimentData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch sentiment data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sentiment
        const sentimentRes = await fetch(`${API_URL}/api/v1/sentiment/global`);
        const sentimentJson = await sentimentRes.json();
        
        // Transform to format needed for heatmap
        const transformed = sentimentJson.map(item => ({
          coordinates: [item.coordinates.longitude, item.coordinates.latitude],
          sentiment: item.sentiment_score,
          intensity: item.intensity,
          location: item.location,
          source_count: item.source_count
        }));
        
        setSentimentData(transformed);

        // Fetch news
        const newsRes = await fetch(`${API_URL}/api/v1/news/breaking?limit=10`);
        const newsJson = await newsRes.json();
        setNewsData(newsJson);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Heatmap layer for sentiment
  const heatmapLayer = useMemo(() => new HeatmapLayer({
    id: 'sentiment-heatmap',
    data: sentimentData,
    getPosition: d => d.coordinates,
    getWeight: d => d.intensity,
    radiusPixels: 60,
    intensity: 1,
    threshold: 0.03,
    colorRange: [
      [178, 24, 43, 100],      // Deep red (very negative)
      [239, 138, 98, 150],     // Orange-red
      [253, 219, 199, 100],    // Light salmon
      [247, 247, 247, 50],     // Neutral white
      [209, 229, 240, 100],    // Light blue
      [103, 169, 207, 150],    // Medium blue
      [33, 102, 172, 200]      // Deep blue (very positive)
    ],
    visible: sentimentLayer
  }), [sentimentData, sentimentLayer]);

  // Breaking news markers
  const newsIconLayer = useMemo(() => new IconLayer({
    id: 'breaking-news',
    data: newsData,
    getPosition: d => [d.coordinates.longitude, d.coordinates.latitude],
    getIcon: d => ({
      url: d.urgency === 'high' 
        ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2VmNDQ0NCIvPjwvc3ZnPg==' 
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2Y5NzMxNiIvPjwvc3ZnPg==',
      width: 32,
      height: 32
    }),
    getSize: 32,
    sizeScale: 1,
    pickable: true,
    onClick: (info) => setSelectedLocation(info.object),
    visible: newsLayer
  }), [newsData, newsLayer]);

  const layers = [heatmapLayer, newsIconLayer];

  const handleMapClick = useCallback((event) => {
    const { lngLat } = event;
    console.log('Clicked:', lngLat);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Loading WRLD VSN...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-gray-900">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 text-white">
        <h1 className="text-2xl font-bold mb-4">WRLD VSN</h1>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sentimentLayer}
              onChange={(e) => setSentimentLayer(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Sentiment Heatmap</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newsLayer}
              onChange={(e) => setNewsLayer(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Breaking News</span>
          </label>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          <div>Cities tracked: {sentimentData.length}</div>
          <div>News events: {newsData.length}</div>
        </div>
      </div>

      {/* Sentiment Legend */}
      {sentimentLayer && (
        <div className="absolute bottom-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="text-sm font-semibold mb-2">Sentiment</div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-3 rounded" style={{
              background: 'linear-gradient(to right, #b2182b, #ef8a62, #fddbc7, #f7f7f7, #d1e5f0, #67a9cf, #2166ac)'
            }}></div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="flex items-center"><TrendingDown size={12} className="mr-1" />Bearish</span>
            <span>Neutral</span>
            <span className="flex items-center"><TrendingUp size={12} className="mr-1" />Bullish</span>
          </div>
        </div>
      )}

      {/* Map */}
      <DeckGL
        viewState={viewport}
        controller={true}
        onViewStateChange={({ viewState }) => setViewport(viewState)}
        layers={layers}
        onClick={handleMapClick}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      {/* Location Detail Panel */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute top-0 right-0 w-96 h-full bg-gray-800/95 backdrop-blur-md text-white overflow-y-auto z-20"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedLocation.title}</h2>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Sentiment Indicator */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mb-4 ${
                selectedLocation.sentiment === 'bullish' 
                  ? 'bg-green-500/20 text-green-400' 
                  : selectedLocation.sentiment === 'bearish'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {selectedLocation.sentiment === 'bullish' ? (
                  <TrendingUp size={16} className="mr-1" />
                ) : selectedLocation.sentiment === 'bearish' ? (
                  <TrendingDown size={16} className="mr-1" />
                ) : (
                  <Activity size={16} className="mr-1" />
                )}
                {selectedLocation.sentiment?.toUpperCase() || 'NEUTRAL'}
              </div>

              <div className="text-sm text-gray-400 mb-4">
                {new Date(selectedLocation.timestamp).toLocaleString()}
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="border-b border-gray-700 pb-2">
                  <div className="text-sm font-semibold mb-2">Summary</div>
                  <div className="text-sm text-gray-300">
                    {selectedLocation.summary || 'Breaking news event'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-semibold mb-2">Source</div>
                  <div className="text-sm text-gray-300">
                    {selectedLocation.source}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="absolute bottom-4 right-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm flex items-center space-x-4">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span>Live</span>
        </div>
        <div>Last update: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default WorldMap;
