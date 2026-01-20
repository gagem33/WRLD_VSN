import React, { useEffect, useState, useCallback } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker } from "react-map-gl";
import DeckGL, { HeatmapLayer, IconLayer } from "deck.gl";

const MAPBOX_TOKEN = "YOUR_REAL_MAPBOX_TOKEN"; // Paste your Mapbox token here
const API_URL = "https://wrldvsn.up.railway.app"; // Your Railway backend

const WorldMap = () => {
  const [viewport, setViewport] = useState({
    latitude: 20,
    longitude: 0,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  });

  const [sentimentData, setSentimentData] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/sentiment/global`)
      .then((res) => res.json())
      .then(setSentimentData)
      .catch(console.error);

    fetch(`${API_URL}/api/v1/news/latest`)
      .then((res) => res.json())
      .then(setBreakingNews)
      .catch(console.error);
  }, []);

  const heatmapLayer = new HeatmapLayer({
    id: "sentiment-heatmap",
    data: sentimentData,
    getPosition: (d) => d.coordinates,
    getWeight: (d) => d.intensity || 1,
    radiusPixels: 80,
  });

  const newsLayer = new IconLayer({
    id: "breaking-news",
    data: breakingNews,
    getPosition: (d) => d.coordinates,
    getIcon: () => ({
      url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg",
      width: 32,
      height: 32,
    }),
    sizeScale: 1,
    pickable: true,
  });

  const handleClick = useCallback((evt) => {
    console.log("Map clicked", evt.lngLat);
  }, []);

  return (
    <DeckGL
      views={null}
      initialViewState={viewport}
      controller={true}
      onViewStateChange={({ viewState }) => setViewport(viewState)}
      layers={[heatmapLayer, newsLayer]}
      onClick={handleClick}
    >
      <Map
        mapboxAccessToken= {eyJ1IjoiZ2FnZW0zMyIsImEiOiJjbWtuNzZnNHcwcDdyM2ZvdmU2azA1ZWQ1In0.UtKWHYCxgad7oaVlhri2Uw}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      />
    </DeckGL>
  );
};

export default WorldMap;
