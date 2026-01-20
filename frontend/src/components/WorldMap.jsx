import React, { useEffect, useState, useCallback } from 'react';
import Map from 'react-map-gl';
import { DeckGL, HeatmapLayer, IconLayer } from 'deck.gl';

const MAPBOX_TOKEN = "your-mapbox-token-here"; // Replace with your actual key
const API_URL = "https://wrldvsn.up.railway.app"; // Hardcoded for now

const WorldMap = () => {
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0
  });

  const [sentimentData, setSentimentData] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);

  useEffect(() => {
    console.log("Fetching from:", API_URL);

    fetch(`${API_URL}/api/v1/sentiment/global`)
      .then(res => res.json())
      .then(data => {
        console.log("Sentiment data:", data);
        setSentimentData(data);
      })
      .catch(err => console.error("Sentiment API error:", err));

    fetch(`${API_URL}/api/v1/news/latest`)
      .then(res => res.json())
      .then(data => {
        console.log("News data:", data);
        setBreakingNews(data);
      })
      .catch(err => console.error("News API error:", err));
  }, []);

  const heatmapLayer = new HeatmapLayer({
    id: 'sentiment-heatmap',
    data: sentimentData,
    getPosition: d => d.coordinates,
    getWeight: d => d.intensity || 50,
    radiusPixels: 60,
    visible: true,
  });

  const newsLayer = new IconLayer({
    id: 'breaking-news',
    data: breakingNews,
    getPosition: d => d.coordinates,
    getSize: 32,
    sizeScale: 1,
    pickable: true,
    getIcon: () => ({
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg',
      width: 32,
      height: 32
    }),
    onClick: info => console.log("Clicked news:", info.object),
    visible: true,
  });

  const handleMapClick = useCallback((event) => {
    const { lngLat } = event;
    console.log('Clicked:', lngLat);
  }, []);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <DeckGL
        viewState={viewport}
        controller={true}
        onViewStateChange={({ viewState }) => setViewport(viewState)}
        layers={[heatmapLayer, newsLayer]}
        onClick={handleMapClick}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>
    </div>
  );
};

export default WorldMap;
