import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { 
  TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  Globe2, DollarSign, Activity, Zap, AlertTriangle,
  X, Maximize2, Minimize2, Settings
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;

mapboxgl.accessToken = MAPBOX_TOKEN;

// TERMINAL COLOR SYSTEM
const colors = {
  bg: {
    primary: '#0a0a0a',
    secondary: '#111111',
    tertiary: '#1a1a1a',
    panel: '#0d0d0d',
  },
  border: {
    primary: '#222222',
    accent: '#00ffff',
    warning: '#ff6b00',
    danger: '#ff0055',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#888888',
    accent: '#00ffff',
    success: '#00ff88',
    warning: '#ff6b00',
    danger: '#ff0055',
  },
  chart: {
    positive: '#00ff88',
    negative: '#ff0055',
    neutral: '#888888',
  }
};

// GLOBAL MARKET TICKER
const MarketTicker = ({ markets }) => {
  return (
    <div style={{
      height: '48px',
      background: colors.bg.secondary,
      borderBottom: `1px solid ${colors.border.primary}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '32px',
      overflowX: 'auto',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
        <Activity size={16} style={{ color: colors.text.accent }} />
        <span style={{ color: colors.text.accent, fontWeight: 600 }}>LIVE MARKETS</span>
      </div>
      
      {markets.map((market, idx) => (
        <div key={idx} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: colors.bg.tertiary,
          borderLeft: `2px solid ${market.change >= 0 ? colors.chart.positive : colors.chart.negative}`,
          minWidth: '180px',
        }}>
          <div>
            <div style={{ color: colors.text.secondary, fontSize: '10px', letterSpacing: '0.05em' }}>
              {market.symbol}
            </div>
            <div style={{ color: colors.text.primary, fontSize: '15px', fontWeight: 600 }}>
              {market.price.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {market.change >= 0 ? (
              <TrendingUp size={14} style={{ color: colors.chart.positive }} />
            ) : (
              <TrendingDown size={14} style={{ color: colors.chart.negative }} />
            )}
            <span style={{ 
              color: market.change >= 0 ? colors.chart.positive : colors.chart.negative,
              fontSize: '13px',
              fontWeight: 600,
            }}>
              {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// LEFT PANEL - DATA TABS
const LeftPanel = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  const tabs = ['COUNTRIES', 'MARKETS', 'COMMODITIES', 'RISK'];
  
  if (!isOpen) {
    return (
      <button
        onClick={() => onClose(false)}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '32px',
          height: '80px',
          background: colors.bg.secondary,
          border: `1px solid ${colors.border.primary}`,
          borderLeft: 'none',
          borderRadius: '0 4px 4px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 50,
          color: colors.text.accent,
          transition: 'all 0.2s',
        }}
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <div style={{
      width: '380px',
      height: '100%',
      background: colors.bg.panel,
      borderRight: `1px solid ${colors.border.primary}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{
        height: '56px',
        borderBottom: `1px solid ${colors.border.primary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <DollarSign size={20} style={{ color: colors.text.accent }} />
          <span style={{
            color: colors.text.primary,
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            GLOBAL DATA
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.text.secondary,
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${colors.border.primary}`,
        background: colors.bg.secondary,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === tab ? colors.bg.tertiary : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${colors.text.accent}` : '2px solid transparent',
              color: activeTab === tab ? colors.text.accent : colors.text.secondary,
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {activeTab === 'COUNTRIES' && <CountriesTab />}
        {activeTab === 'MARKETS' && <MarketsTab />}
        {activeTab === 'COMMODITIES' && <CommoditiesTab />}
        {activeTab === 'RISK' && <RiskTab />}
      </div>
    </div>
  );
};

// TAB COMPONENTS
const CountriesTab = () => (
  <div style={{ color: colors.text.primary }}>
    <div style={{
      fontSize: '11px',
      color: colors.text.secondary,
      marginBottom: '12px',
      letterSpacing: '0.05em',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      TOP ECONOMIES
    </div>
    {['USA', 'CHN', 'JPN', 'DEU', 'GBR', 'IND', 'FRA', 'ITA'].map((code) => (
      <div
        key={code}
        style={{
          padding: '12px',
          marginBottom: '8px',
          background: colors.bg.secondary,
          border: `1px solid ${colors.border.primary}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.text.accent}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border.primary}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {code}
          </span>
          <ChevronRight size={14} style={{ color: colors.text.secondary }} />
        </div>
      </div>
    ))}
  </div>
);

const MarketsTab = () => (
  <div style={{ color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
    <div style={{ fontSize: '11px', color: colors.text.secondary, marginBottom: '12px' }}>
      MAJOR INDICES
    </div>
    {[
      { name: 'S&P 500', value: 5234, change: 1.2 },
      { name: 'NASDAQ', value: 16542, change: 1.8 },
      { name: 'DOW', value: 38234, change: 0.9 },
      { name: 'FTSE 100', value: 7856, change: -0.3 },
    ].map((index) => (
      <div
        key={index.name}
        style={{
          padding: '12px',
          marginBottom: '8px',
          background: colors.bg.secondary,
          border: `1px solid ${colors.border.primary}`,
        }}
      >
        <div style={{ fontSize: '11px', color: colors.text.secondary, marginBottom: '4px' }}>
          {index.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>
            {index.value.toLocaleString()}
          </span>
          <span style={{
            color: index.change >= 0 ? colors.chart.positive : colors.chart.negative,
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {index.change >= 0 ? '+' : ''}{index.change}%
          </span>
        </div>
      </div>
    ))}
  </div>
);

const CommoditiesTab = () => (
  <div style={{ color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
    <div style={{ fontSize: '11px', color: colors.text.secondary, marginBottom: '12px' }}>
      COMMODITIES
    </div>
    {[
      { name: 'GOLD', value: 2034, unit: 'USD/oz', change: 0.5 },
      { name: 'OIL (WTI)', value: 78.4, unit: 'USD/bbl', change: -1.2 },
      { name: 'COPPER', value: 8542, unit: 'USD/t', change: 2.1 },
    ].map((commodity) => (
      <div
        key={commodity.name}
        style={{
          padding: '12px',
          marginBottom: '8px',
          background: colors.bg.secondary,
          border: `1px solid ${colors.border.primary}`,
        }}
      >
        <div style={{ fontSize: '11px', color: colors.text.secondary, marginBottom: '4px' }}>
          {commodity.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>{commodity.value}</span>
            <span style={{ fontSize: '10px', color: colors.text.secondary, marginLeft: '4px' }}>
              {commodity.unit}
            </span>
          </div>
          <span style={{
            color: commodity.change >= 0 ? colors.chart.positive : colors.chart.negative,
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {commodity.change >= 0 ? '+' : ''}{commodity.change}%
          </span>
        </div>
      </div>
    ))}
  </div>
);

const RiskTab = () => (
  <div style={{ color: colors.text.primary }}>
    <div style={{
      fontSize: '11px',
      color: colors.text.secondary,
      marginBottom: '12px',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      GEOPOLITICAL RISK
    </div>
    {[
      { country: 'UKR', score: 9.2, status: 'CRITICAL' },
      { country: 'ISR', score: 8.7, status: 'HIGH' },
      { country: 'TWN', score: 7.4, status: 'ELEVATED' },
      { country: 'VEN', score: 6.8, status: 'ELEVATED' },
    ].map((item) => (
      <div
        key={item.country}
        style={{
          padding: '12px',
          marginBottom: '8px',
          background: colors.bg.secondary,
          border: `1px solid ${item.score >= 9 ? colors.border.danger : item.score >= 7 ? colors.border.warning : colors.border.primary}`,
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {item.country}
          </span>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            background: item.score >= 9 ? colors.border.danger : item.score >= 7 ? colors.border.warning : colors.border.primary,
            color: colors.text.primary,
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}>
            {item.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            flex: 1,
            height: '6px',
            background: colors.bg.primary,
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${item.score * 10}%`,
              height: '100%',
              background: item.score >= 9 ? colors.border.danger : item.score >= 7 ? colors.border.warning : colors.chart.positive,
            }}></div>
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            fontWeight: 600,
            minWidth: '32px',
            textAlign: 'right',
          }}>
            {item.score}
          </span>
        </div>
      </div>
    ))}
  </div>
);

// MAIN TERMINAL COMPONENT
const Terminal = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeLeftTab, setActiveLeftTab] = useState('COUNTRIES');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [financialNews, setFinancialNews] = useState([]);
  const [markets, setMarkets] = useState([
    { symbol: 'S&P 500', price: 5234.23, change: 1.2 },
    { symbol: 'NASDAQ', price: 16542.18, change: 1.8 },
    { symbol: 'DOW', price: 38234.56, change: 0.9 },
    { symbol: 'GOLD', price: 2034.50, change: 0.5 },
    { symbol: 'OIL', price: 78.40, change: -1.2 },
    { symbol: 'BTC', price: 43250, change: 3.4 },
  ]);
  
  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    console.log('🗺️ Initializing terminal map...');
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 20],
        zoom: 2,
        pitch: 45,
        projection: 'globe',
      });

      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
      }), 'bottom-right');
      
      // Country click handler
      map.current.on('click', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['country-boundaries']  // Adjust based on your map style
        });
        
        if (features.length > 0) {
          const countryCode = features[0].properties.iso_3166_1 || features[0].properties.code;
          if (countryCode) {
            fetchCountryIntelligence(countryCode);
          }
        }
      });
      
      console.log('✅ Terminal map initialized');
    } catch (error) {
      console.error('❌ Map error:', error);
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch news
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/news/financial`);
        const data = await res.json();
        setFinancialNews(data.news || []);
      } catch (error) {
        console.error('News fetch error:', error);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/markets/live`);
        const data = await res.json();
        
        // Transform backend data to ticker format
        const tickerData = [];
        
        if (data.equities) {
          data.equities.slice(0, 3).forEach(eq => {
            tickerData.push({
              symbol: eq.name,
              price: eq.value,
              change: eq.change,
            });
          });
        }
        
        if (data.crypto) {
          data.crypto.slice(0, 2).forEach(crypto => {
            tickerData.push({
              symbol: crypto.symbol,
              price: crypto.value,
              change: crypto.change,
            });
          });
        }
        
        if (tickerData.length > 0) {
          setMarkets(tickerData);
        }
      } catch (error) {
        console.error('Markets fetch error:', error);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCountryIntelligence = async (countryCode) => {
    console.log('🌍 Fetching intel for:', countryCode);
    // This will be implemented with backend API
    setSelectedCountry({
      code: countryCode,
      name: 'Loading...',
      gdp: 0,
      growth: 0,
      inflation: 0,
      rate: 0,
      riskScore: 0,
    });
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'NOW';
    if (diffMins < 60) return `${diffMins}M`;
    if (diffHours < 24) return `${diffHours}H`;
    return `${Math.floor(diffHours / 24)}D`;
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg.primary,
        color: colors.text.danger,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', fontWeight: 600 }}>MAPBOX_TOKEN MISSING</div>
          <div style={{ fontSize: '12px', color: colors.text.secondary, marginTop: '8px' }}>
            Add REACT_APP_MAPBOX_TOKEN to environment
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: colors.bg.primary,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Market Ticker */}
      <MarketTicker markets={markets} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Panel */}
        <LeftPanel
          isOpen={leftPanelOpen}
          onClose={() => setLeftPanelOpen(!leftPanelOpen)}
          activeTab={activeLeftTab}
          setActiveTab={setActiveLeftTab}
        />

        {/* Center - Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          
          {/* Country Intelligence Card */}
          {selectedCountry && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '480px',
              background: colors.bg.panel,
              border: `1px solid ${colors.border.accent}`,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              zIndex: 100,
            }}>
              <div style={{
                padding: '16px',
                borderBottom: `1px solid ${colors.border.primary}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: colors.text.primary,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {selectedCountry.code}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.text.secondary,
                    marginTop: '4px',
                  }}>
                    {selectedCountry.name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCountry(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.text.secondary,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ padding: '16px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}>
                  <DataPoint label="GDP" value={`$${selectedCountry.gdp}T`} />
                  <DataPoint label="GROWTH" value={`${selectedCountry.growth}%`} trend />
                  <DataPoint label="INFLATION" value={`${selectedCountry.inflation}%`} />
                  <DataPoint label="RATE" value={`${selectedCountry.rate}%`} />
                  <DataPoint 
                    label="RISK SCORE" 
                    value={selectedCountry.riskScore} 
                    color={selectedCountry.riskScore >= 7 ? colors.text.danger : selectedCountry.riskScore >= 5 ? colors.text.warning : colors.chart.positive}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - News Feed */}
        {rightPanelOpen ? (
          <div style={{
            width: '400px',
            height: '100%',
            background: colors.bg.panel,
            borderLeft: `1px solid ${colors.border.primary}`,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              height: '56px',
              borderBottom: `1px solid ${colors.border.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap size={20} style={{ color: colors.text.accent }} />
                <span style={{
                  color: colors.text.primary,
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  LIVE FEED
                </span>
              </div>
              <button
                onClick={() => setRightPanelOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.text.secondary,
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {financialNews.map((article, idx) => (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    borderBottom: `1px solid ${colors.border.primary}`,
                    textDecoration: 'none',
                    borderLeft: `3px solid ${
                      article.sentiment === 'bullish' ? colors.chart.positive :
                      article.sentiment === 'bearish' ? colors.chart.negative :
                      colors.chart.neutral
                    }`,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.bg.secondary}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    fontSize: '13px',
                    color: colors.text.primary,
                    lineHeight: '1.4',
                    marginBottom: '8px',
                  }}>
                    {article.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <span style={{ color: colors.text.secondary }}>
                      {article.source}
                    </span>
                    <span style={{ color: colors.text.accent }}>
                      {getRelativeTime(article.timestamp)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRightPanelOpen(true)}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '80px',
              background: colors.bg.secondary,
              border: `1px solid ${colors.border.primary}`,
              borderRight: 'none',
              borderRadius: '4px 0 0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 50,
              color: colors.text.accent,
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

// HELPER COMPONENT
const DataPoint = ({ label, value, trend, color }) => (
  <div style={{
    padding: '8px',
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.primary}`,
  }}>
    <div style={{
      fontSize: '9px',
      color: colors.text.secondary,
      marginBottom: '4px',
      letterSpacing: '0.05em',
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '14px',
      fontWeight: 600,
      color: color || colors.text.primary,
    }}>
      {value}
    </div>
  </div>
);

export default Terminal;
