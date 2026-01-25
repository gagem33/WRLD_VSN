import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl, Source, Layer } from 'react-map-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, Map as MapIcon, Menu, X, Activity, Zap, TrendingUp, TrendingDown,
  Search, BarChart3, Download, Clock, Bell, Plus, Trash2, Settings,
  ChevronRight, FileText, Image as ImageIcon, ExternalLink, Satellite,
  Play, Pause, RefreshCw, MapPin, DollarSign, AlertTriangle, Cloud,
  Calendar, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
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
  const [selectedCity, setSelectedCity] = useState(null);
  
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

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
        // Fetch markets (fast refresh)
        const marketsRes = await fetch(`${API_URL}/api/v1/markets/live`);
        const marketsData = await marketsRes.json();
        setLiveMarkets(marketsData);
        setDataQuality(marketsData.data_quality || {});

        // Fetch news (medium refresh)
        const newsRes = await fetch(`${API_URL}/api/v1/news/financial`);
        const newsData = await newsRes.json();
        setFinancialNews(newsData.news || []);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
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
        console.error('Error fetching weather:', error);
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
        console.error('Error fetching calendar:', error);
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
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <div className="text-white text-2xl font-bold mb-2">WRLD VSN V3</div>
          <div className="text-gray-500 text-sm">Loading real-time intelligence...</div>
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
          onClick={() => setShowWeatherLayer(!showWeatherLayer)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            showWeatherLayer ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Weather Layer"
        >
          <Cloud size={20} />
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
          onClick={() => setActivePanel(activePanel === 'calendar' ? null : 'calendar')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Economic Calendar"
        >
          <Calendar size={20} />
        </button>
        
        <button 
          onClick={() => setActivePanel(activePanel === 'quality' ? null : 'quality')}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            activePanel === 'quality' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title="Data Quality"
        >
          <Activity size={20} />
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
            className="absolute left-16 top-0 bottom-0 w-96 bg-gray-900/98 backdrop-blur-xl border-r border-gray-800 z-20 overflow-y-auto"
          >
            <div className="p-4">
              {/* GLOBAL MARKETS PANEL */}
              {activePanel === 'markets' && liveMarkets && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Global Markets</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Equities */}
                  {liveMarkets.equities && liveMarkets.equities.length > 0 && (
                    <div className="mb-6">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Equities</div>
                      <div className="space-y-3">
                        {liveMarkets.equities.map((equity, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-gray-800/50 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-white font-semibold">{equity.name}</div>
                                <div className="text-xs text-gray-500">{equity.symbol}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-white font-mono">
                                  {equity.value.toFixed(2)}
                                </div>
                                <div className={`text-sm font-semibold ${equity.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {equity.change > 0 ? '+' : ''}{equity.change.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                            
                            {/* Candlestick chart would go here - placeholder for now */}
                            <div className="h-20 bg-gray-900/50 rounded mt-2 flex items-center justify-center">
                              <div className="text-xs text-gray-600">Chart data loading...</div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3 text-xs">
                              <div className="flex items-center space-x-2">
                                {equity.status === 'verified' ? (
                                  <CheckCircle size={12} className="text-green-400" />
                                ) : (
                                  <AlertCircle size={12} className="text-yellow-400" />
                                )}
                                <span className="text-gray-400">{equity.source}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  equity.market_status === 'OPEN' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-gray-400">{equity.age_seconds}s ago</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Crypto */}
                  {liveMarkets.crypto && liveMarkets.crypto.length > 0 && (
                    <div className="mb-6">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Cryptocurrency</div>
                      <div className="space-y-3">
                        {liveMarkets.crypto.map((coin, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-gray-800/50 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-white font-semibold">{coin.symbol}</div>
                                <div className="text-xs text-gray-500">24/7 Trading</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-white font-mono">
                                  ${coin.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </div>
                                <div className={`text-sm font-semibold ${coin.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {coin.change > 0 ? '+' : ''}{coin.change.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                            
                            {/* Candlestick Chart */}
                            {coin.candlestick_data && coin.candlestick_data.length > 0 && (
                              <CandlestickChart data={coin.candlestick_data} />
                            )}
                            
                            <div className="flex items-center justify-between mt-3 text-xs">
                              <div className="flex items-center space-x-2">
                                {coin.status === 'verified' ? (
                                  <CheckCircle size={12} className="text-green-400" />
                                ) : (
                                  <AlertCircle size={12} className="text-yellow-400" />
                                )}
                                <span className="text-gray-400">{coin.source}</span>
                              </div>
                              <div className="text-gray-400">{coin.age_seconds}s ago</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ECONOMIC CALENDAR PANEL */}
              {activePanel === 'calendar' && economicCalendar && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Economic Calendar</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {economicCalendar.events && economicCalendar.events.length > 0 ? (
                    <div className="space-y-3">
                      {economicCalendar.events.map((event, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`border-l-4 ${
                            event.impact === 'high' ? 'border-red-500 bg-red-900/10' :
                            event.impact === 'medium' ? 'border-yellow-500 bg-yellow-900/10' :
                            'border-gray-500 bg-gray-900/10'
                          } rounded-r-lg p-4`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="text-white font-semibold text-sm">{event.event}</div>
                              <div className="text-xs text-gray-400 mt-1">{event.country}</div>
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded ${
                              event.impact === 'high' ? 'bg-red-900/30 text-red-400' :
                              event.impact === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-gray-900/30 text-gray-400'
                            }`}>
                              {event.impact.toUpperCase()}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(event.date).toLocaleString()}
                          </div>
                          
                          {(event.actual || event.estimate || event.previous) && (
                            <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                              {event.previous && (
                                <div>
                                  <div className="text-gray-500">Previous</div>
                                  <div className="text-white font-mono">{event.previous}</div>
                                </div>
                              )}
                              {event.estimate && (
                                <div>
                                  <div className="text-gray-500">Estimate</div>
                                  <div className="text-white font-mono">{event.estimate}</div>
                                </div>
                              )}
                              {event.actual && (
                                <div>
                                  <div className="text-gray-500">Actual</div>
                                  <div className="text-green-400 font-mono font-bold">{event.actual}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      No upcoming events
                    </div>
                  )}
                </>
              )}

              {/* DATA QUALITY PANEL */}
              {activePanel === 'quality' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Data Quality</h2>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {dataQuality.equities && (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="text-white font-semibold mb-3">Equities</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total</span>
                            <span className="text-white font-mono">{dataQuality.equities.total}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Verified</span>
                            <span className="text-green-400 font-mono">{dataQuality.equities.verified}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Stale</span>
                            <span className="text-yellow-400 font-mono">{dataQuality.equities.stale}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {dataQuality.crypto && (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="text-white font-semibold mb-3">Cryptocurrency</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total</span>
                            <span className="text-white font-mono">{dataQuality.crypto.total}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Verified</span>
                            <span className="text-green-400 font-mono">{dataQuality.crypto.verified}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Stale</span>
                            <span className="text-yellow-400 font-mono">{dataQuality.crypto.stale}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                      <div className="text-blue-400 font-semibold mb-2">✅ Accuracy Guaranteed</div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>• No fake or mock data</div>
                        <div>• Multi-source validation</div>
                        <div>• Real-time updates</div>
                        <div>• Market hours aware</div>
                      </div>
                    </div>
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
              <div className="text-xs text-gray-500">V3 • Accuracy Guaranteed</div>
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
                <span className="text-white font-bold font-mono">
                  {(liveMarkets?.equities?.length || 0) + (liveMarkets?.crypto?.length || 0)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-gray-400">News</span>
                <span className="text-white font-bold font-mono">{financialNews.length}</span>
              </div>
            </div>
            <div className="text-gray-500 font-mono text-sm tabular-nums">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Map + News Feed */}
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

              {/* Weather Layer */}
              {showWeatherLayer && weatherData && weatherData.storms && weatherData.storms.map((storm, idx) => (
                <Marker
                  key={`storm-${idx}`}
                  longitude={storm.lng}
                  latitude={storm.lat}
                  anchor="center"
                >
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 rounded-full animate-ping bg-red-500/30" style={{width: '40px', height: '40px', transform: 'translate(-50%, -50%)', left: '50%', top: '50%'}}></div>
                    <div className="relative z-10 bg-red-500 rounded-full p-2">
                      <Cloud size={16} className="text-white" />
                    </div>
                    <div className="absolute left-8 top-0 bg-gray-900/95 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="font-bold">{storm.type}</div>
                      <div className="text-gray-400">{storm.city}</div>
                    </div>
                  </div>
                </Marker>
              ))}
            </Map>

            <div className="absolute bottom-6 left-6 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Data Status</div>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className="text-gray-300">Verified</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <AlertCircle size={12} className="text-yellow-500" />
                  <span className="text-gray-300">Stale</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Loader size={12} className="text-blue-500 animate-spin" />
                  <span className="text-gray-300">Updating</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - LIVE NEWS FEED */}
          <div className="w-96 bg-gray-900/98 border-l border-gray-800 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white tracking-wide">Live Intelligence Feed</div>
                <div className="flex items-center space-x-2 px-2 py-1 rounded bg-green-900/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs font-semibold">LIVE</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{financialNews.length} articles • Quality filtered</div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence>
                {financialNews.map((article, idx) => (
                  <motion.a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="block px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-1.5 h-full rounded-full mt-1 flex-shrink-0 ${
                        article.sentiment === 'bullish' ? 'bg-green-500' : 
                        article.sentiment === 'bearish' ? 'bg-red-500' : 
                        'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white leading-tight mb-2 group-hover:text-blue-300 transition-colors">
                          {article.title}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">{article.source}</span>
                            {article.city && (
                              <>
                                <span className="text-gray-700">•</span>
                                <span className="text-blue-400">{article.city}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600 font-mono text-[10px]">
                              {getRelativeTime(article.timestamp)}
                            </span>
                            <ExternalLink size={10} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                          </div>
                        </div>
                        {article.quality_score && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-800 rounded-full h-1">
                                <div 
                                  className={`h-1 rounded-full ${
                                    article.quality_score > 70 ? 'bg-green-500' :
                                    article.quality_score > 40 ? 'bg-yellow-500' :
                                    'bg-gray-500'
                                  }`}
                                  style={{ width: `${article.quality_score}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] text-gray-600 font-mono">{article.quality_score}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
