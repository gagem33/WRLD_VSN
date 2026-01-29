import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { 
  TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  Activity, Zap, AlertTriangle, X, Calculator, Search
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const API_URL = process.env.REACT_APP_API_URL;
mapboxgl.accessToken = MAPBOX_TOKEN;

const colors = {
  bg: { primary: '#0a0a0a', secondary: '#111111', tertiary: '#1a1a1a', panel: '#0d0d0d' },
  border: { primary: '#222222', accent: '#00ffff', warning: '#ff6b00', danger: '#ff0055' },
  text: { primary: '#e0e0e0', secondary: '#888888', accent: '#00ffff', warning: '#ff6b00', danger: '#ff0055' },
  chart: { positive: '#00ff88', negative: '#ff0055', neutral: '#888888' }
};

// ============================================================================
// CUSTOM HOOK: useSnapshot
// ============================================================================

function useSnapshot(endpoint, pollInterval) {
  const [snapshot, setSnapshot] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [lastVersion, setLastVersion] = useState(0);
  const pollTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const fetchSnapshot = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.status === 'initializing') return;
      
      if (data.data_version && data.data_version <= lastVersion && lastVersion > 0) {
        setIsStale(true);
      } else {
        setIsStale(false);
        setLastVersion(data.data_version);
      }
      
      setSnapshot(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`${endpoint} fetch failed:`, error);
        setIsStale(true);
      }
    }
  };
  
  useEffect(() => {
    fetchSnapshot();
    pollTimerRef.current = setInterval(fetchSnapshot, pollInterval);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [endpoint, pollInterval]);
  
  return { snapshot, isStale };
}

// ============================================================================
// MACRO MARKET DASHBOARD (LEFT PANEL)
// ============================================================================

const MacroDashboard = ({ isOpen, onClose }) => {
  const macro = useSnapshot('/api/v1/snapshot/macro-overview', 30000); // 30 seconds
  
  if (!isOpen) {
    return (
      <button
        onClick={() => onClose(true)}
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
        }}
      >
        <ChevronRight size={18} />
      </button>
    );
  }
  
  const instruments = macro.snapshot?.instruments || [];
  
  return (
    <div style={{
      width: '320px',
      height: '100%',
      background: colors.bg.panel,
      borderRight: `1px solid ${colors.border.primary}`,
      display: 'flex',
      flexDirection: 'column',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={20} style={{ color: macro.isStale ? colors.text.warning : colors.text.accent }} />
          <span style={{
            color: colors.text.primary,
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            MACRO MARKETS
          </span>
        </div>
        <button
          onClick={() => onClose(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.text.secondary,
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Instruments List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {instruments.map((inst, idx) => {
          const isPositive = inst.change_percent >= 0;
          const isNeutral = Math.abs(inst.change_percent) < 0.01;
          
          return (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${colors.border.primary}`,
                borderLeft: `3px solid ${isNeutral ? colors.chart.neutral : isPositive ? colors.chart.positive : colors.chart.negative}`,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: colors.text.primary,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {inst.name}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {inst.type}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: colors.text.primary,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {inst.value.toLocaleString(undefined, { 
                    minimumFractionDigits: inst.type === 'index' ? 0 : 2,
                    maximumFractionDigits: inst.type === 'index' ? 0 : 2 
                  })}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {!isNeutral && (isPositive ? (
                    <TrendingUp size={12} style={{ color: colors.chart.positive }} />
                  ) : (
                    <TrendingDown size={12} style={{ color: colors.chart.negative }} />
                  ))}
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isNeutral ? colors.chart.neutral : isPositive ? colors.chart.positive : colors.chart.negative,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {isPositive ? '+' : ''}{inst.change_percent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// NEWS PANEL (RIGHT SIDE)
// ============================================================================

const NewsPanel = ({ isOpen, onClose }) => {
  const news = useSnapshot('/api/v1/snapshot/news', 120000); // 2 minutes
  
  if (!isOpen) {
    return (
      <button
        onClick={() => onClose(true)}
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
    );
  }
  
  const articles = news.snapshot?.articles || [];
  
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'N/A';
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
  
  return (
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
          <Zap size={20} style={{ color: news.isStale ? colors.text.warning : colors.text.accent }} />
          <span style={{
            color: colors.text.primary,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {news.isStale ? 'STALE FEED' : 'LIVE FEED'}
          </span>
        </div>
        <button
          onClick={() => onClose(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.text.secondary,
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {articles.map((article, idx) => (
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
              fontSize: '10px',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{ color: colors.text.secondary }}>{article.source}</span>
              <span style={{ color: colors.text.accent }}>{getRelativeTime(article.article_timestamp)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// STOCK ANALYSIS MODAL
// ============================================================================

const StockAnalysisModal = ({ isOpen, onClose }) => {
  const [ticker, setTicker] = useState('');
  const [financials, setFinancials] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Assumptions (user adjustable)
  const [revenueGrowth, setRevenueGrowth] = useState(10);
  const [netMargin, setNetMargin] = useState(15);
  const [terminalMultiple, setTerminalMultiple] = useState(20);
  const [discountRate, setDiscountRate] = useState(10);
  
  const analyzeStock = async () => {
    if (!ticker.trim()) return;
    
    setLoading(true);
    setError(null);
    setFinancials(null);
    setValuation(null);
    
    try {
      // Fetch financials
      const financialsResp = await fetch(`${API_URL}/api/v1/stock/financials/${ticker.toUpperCase()}`);
      const financialsData = await financialsResp.json();
      
      if (financialsData.error) {
        throw new Error(financialsData.error);
      }
      
      setFinancials(financialsData);
      
      // Set default assumptions from historicals
      if (financialsData.historical_growth) {
        setRevenueGrowth(Math.round(financialsData.historical_growth));
      }
      if (financialsData.net_margin) {
        setNetMargin(Math.round(financialsData.net_margin));
      }
      if (financialsData.pe_ratio && financialsData.pe_ratio > 0) {
        setTerminalMultiple(Math.round(financialsData.pe_ratio));
      }
      
      // Calculate fair value
      const valuationResp = await fetch(`${API_URL}/api/v1/stock/fair-value/${ticker.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_growth: revenueGrowth,
          net_margin: netMargin,
          terminal_multiple: terminalMultiple,
          discount_rate: discountRate,
        }),
      });
      
      const valuationData = await valuationResp.json();
      setValuation(valuationData.valuation);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const recalculate = async () => {
    if (!financials) return;
    
    try {
      const valuationResp = await fetch(`${API_URL}/api/v1/stock/fair-value/${ticker.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_growth: revenueGrowth,
          net_margin: netMargin,
          terminal_multiple: terminalMultiple,
          discount_rate: discountRate,
        }),
      });
      
      const valuationData = await valuationResp.json();
      setValuation(valuationData.valuation);
    } catch (err) {
      setError(err.message);
    }
  };
  
  useEffect(() => {
    if (financials) {
      recalculate();
    }
  }, [revenueGrowth, netMargin, terminalMultiple, discountRate]);
  
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: '600px',
        maxHeight: '80vh',
        background: colors.bg.panel,
        border: `1px solid ${colors.border.accent}`,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${colors.border.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calculator size={20} style={{ color: colors.text.accent }} />
            <span style={{
              fontSize: '16px',
              fontWeight: 600,
              color: colors.text.primary,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              STOCK FAIR VALUE ANALYSIS
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Ticker Input */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <input
                type="text"
                placeholder="Enter ticker (e.g., AAPL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && analyzeStock()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: colors.bg.secondary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: '4px',
                  color: colors.text.primary,
                  fontSize: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <button
                onClick={analyzeStock}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: colors.text.accent,
                  color: colors.bg.primary,
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Loading...' : 'ANALYZE'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(255, 0, 85, 0.1)',
              border: `1px solid ${colors.border.danger}`,
              borderRadius: '4px',
              color: colors.text.danger,
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* Results */}
          {financials && valuation && (
            <div>
              {/* Company Info */}
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: colors.bg.secondary,
                borderRadius: '4px',
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: colors.text.primary,
                  marginBottom: '8px',
                }}>
                  {financials.company_name} ({financials.ticker})
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '13px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <div>
                    <span style={{ color: colors.text.secondary }}>Current Price:</span>
                    <span style={{ color: colors.text.primary, fontWeight: 600, marginLeft: '8px' }}>
                      ${financials.current_price.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.text.secondary }}>Market Cap:</span>
                    <span style={{ color: colors.text.primary, fontWeight: 600, marginLeft: '8px' }}>
                      ${(financials.market_cap / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.text.secondary }}>Revenue (TTM):</span>
                    <span style={{ color: colors.text.primary, fontWeight: 600, marginLeft: '8px' }}>
                      ${(financials.revenue_ttm / 1e9).toFixed(2)}B
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.text.secondary }}>Net Margin:</span>
                    <span style={{ color: colors.text.primary, fontWeight: 600, marginLeft: '8px' }}>
                      {financials.net_margin}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Valuation Result */}
              <div style={{
                marginBottom: '20px',
                padding: '20px',
                background: valuation.upside_percent > 0 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 0, 85, 0.1)',
                border: `2px solid ${valuation.upside_percent > 0 ? colors.chart.positive : colors.chart.negative}`,
                borderRadius: '4px',
              }}>
                <div style={{
                  fontSize: '14px',
                  color: colors.text.secondary,
                  marginBottom: '8px',
                }}>
                  ESTIMATED FAIR VALUE
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 600,
                  color: colors.text.primary,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: '8px',
                }}>
                  ${valuation.fair_value.toFixed(2)}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: valuation.upside_percent > 0 ? colors.chart.positive : colors.chart.negative,
                }}>
                  {valuation.upside_percent > 0 ? 'UNDERVALUED' : 'OVERVALUED'} by {Math.abs(valuation.upside_percent).toFixed(1)}%
                </div>
              </div>

              {/* Assumptions Sliders */}
              <div style={{
                padding: '16px',
                background: colors.bg.secondary,
                borderRadius: '4px',
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text.primary,
                  marginBottom: '16px',
                }}>
                  ADJUST ASSUMPTIONS
                </div>

                {[
                  { label: 'Revenue Growth', value: revenueGrowth, setValue: setRevenueGrowth, min: -20, max: 50, unit: '%' },
                  { label: 'Net Margin', value: netMargin, setValue: setNetMargin, min: 0, max: 50, unit: '%' },
                  { label: 'Terminal P/E', value: terminalMultiple, setValue: setTerminalMultiple, min: 5, max: 50, unit: 'x' },
                  { label: 'Discount Rate', value: discountRate, setValue: setDiscountRate, min: 5, max: 20, unit: '%' },
                ].map((slider, idx) => (
                  <div key={idx} style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <span style={{ color: colors.text.secondary }}>{slider.label}</span>
                      <span style={{ color: colors.text.accent, fontWeight: 600 }}>
                        {slider.value}{slider.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      value={slider.value}
                      onChange={(e) => slider.setValue(Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '4px',
                        background: colors.bg.tertiary,
                        outline: 'none',
                        appearance: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN TERMINAL COMPONENT
// ============================================================================

const Terminal = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [stockAnalysisOpen, setStockAnalysisOpen] = useState(false);
  
  // Initialize map (FLAT 2D, NO GLOBE)
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 20],
        zoom: 2,
        pitch: 0,  // FLAT MAP
        projection: 'mercator',  // 2D PROJECTION
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      console.log('✅ Map initialized (flat 2D)');
    } catch (error) {
      console.error('❌ Map error:', error);
    }
    
    return () => {
      if (map.current) map.current.remove();
    };
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg.primary,
        color: colors.text.danger,
      }}>
        <AlertTriangle size={48} />
        <div>MAPBOX_TOKEN MISSING</div>
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
    }}>
      {/* Top Bar with Controls */}
      <div style={{
        height: '48px',
        background: colors.bg.secondary,
        borderBottom: `1px solid ${colors.border.primary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 600,
          color: colors.text.accent,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          WRLD VSN
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Stock Analysis Button */}
          <button
            onClick={() => setStockAnalysisOpen(true)}
            style={{
              padding: '8px 16px',
              background: colors.bg.tertiary,
              border: `1px solid ${colors.border.accent}`,
              borderRadius: '4px',
              color: colors.text.accent,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Calculator size={14} />
            STOCK ANALYSIS
          </button>
          
          {/* News Panel Toggle */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              style={{
                padding: '8px 16px',
                background: colors.bg.tertiary,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: '4px',
                color: colors.text.primary,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Zap size={14} />
              NEWS
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Panel - Macro Dashboard */}
        <MacroDashboard isOpen={leftPanelOpen} onClose={setLeftPanelOpen} />
        
        {/* Center - Map */}
        <div style={{ flex: 1 }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
        
        {/* Right Panel - News */}
        <NewsPanel isOpen={rightPanelOpen} onClose={setRightPanelOpen} />
      </div>
      
      {/* Stock Analysis Modal */}
      <StockAnalysisModal isOpen={stockAnalysisOpen} onClose={() => setStockAnalysisOpen(false)} />
    </div>
  );
};

export default Terminal;
