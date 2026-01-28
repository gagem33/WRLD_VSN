import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { TrendingUp, TrendingDown, ChevronRight, ChevronLeft, DollarSign, Activity, Zap, AlertTriangle } from 'lucide-react';
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

// CONTROLLED POLLING HOOK
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

const Terminal = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  
  const markets = useSnapshot('/api/v1/snapshot/markets', 15000);
  const news = useSnapshot('/api/v1/snapshot/news', 120000);
  
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 20],
        zoom: 2,
        pitch: 45,
        projection: 'globe',
      });
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    } catch (error) {
      console.error('Map error:', error);
    }
    return () => { if (map.current) map.current.remove(); };
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg.primary, color: colors.text.danger }}>
        <AlertTriangle size={48} />
        <div>MAPBOX_TOKEN MISSING</div>
      </div>
    );
  }

  const allAssets = [...(markets.snapshot?.equities || []).slice(0, 3), ...(markets.snapshot?.crypto || []).slice(0, 3)];

  return (
    <div style={{ height: '100vh', width: '100vw', background: colors.bg.primary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Ticker */}
      {markets.snapshot && (
        <div style={{ height: '48px', background: colors.bg.secondary, borderBottom: `1px solid ${colors.border.primary}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '32px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: markets.isStale ? colors.text.warning : colors.text.accent }} />
            <span style={{ color: markets.isStale ? colors.text.warning : colors.text.accent, fontWeight: 600, fontFamily: 'monospace' }}>
              {markets.isStale ? 'STALE' : 'LIVE'} v{markets.snapshot.data_version}
            </span>
          </div>
          {allAssets.map((asset, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: colors.bg.tertiary, borderLeft: `2px solid ${(asset.change_percent || asset.change_percent_24h || 0) >= 0 ? colors.chart.positive : colors.chart.negative}` }}>
              <div>
                <div style={{ color: colors.text.secondary, fontSize: '10px' }}>{asset.symbol || asset.name}</div>
                <div style={{ color: colors.text.primary, fontSize: '15px', fontWeight: 600 }}>{asset.price?.toFixed(2)}</div>
              </div>
              <span style={{ color: (asset.change_percent || asset.change_percent_24h || 0) >= 0 ? colors.chart.positive : colors.chart.negative, fontSize: '13px', fontWeight: 600 }}>
                {(asset.change_percent || asset.change_percent_24h || 0) >= 0 ? '+' : ''}{(asset.change_percent || asset.change_percent_24h || 0).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
        
        {/* News */}
        {rightPanelOpen && news.snapshot && (
          <div style={{ width: '400px', background: colors.bg.panel, borderLeft: `1px solid ${colors.border.primary}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '56px', borderBottom: `1px solid ${colors.border.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap size={20} style={{ color: news.isStale ? colors.text.warning : colors.text.accent }} />
                <span style={{ color: colors.text.primary, fontSize: '14px', fontWeight: 600 }}>
                  {news.isStale ? 'STALE FEED' : 'LIVE FEED'}
                </span>
              </div>
              <button onClick={() => setRightPanelOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}>
                <ChevronRight size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {news.snapshot.articles?.map((article, idx) => (
                <a key={idx} href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 16px', borderBottom: `1px solid ${colors.border.primary}`, textDecoration: 'none', borderLeft: `3px solid ${article.sentiment === 'bullish' ? colors.chart.positive : article.sentiment === 'bearish' ? colors.chart.negative : colors.chart.neutral}` }}>
                  <div style={{ fontSize: '13px', color: colors.text.primary, marginBottom: '8px' }}>{article.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace' }}>
                    <span style={{ color: colors.text.secondary }}>{article.source}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;
