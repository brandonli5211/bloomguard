'use client';

import { useState } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Lake Erie approximate bounds for image overlay
// Format: [longitude, latitude] for each corner: SW, SE, NE, NW
const LAKE_ERIE_BOUNDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-83.5, 41.3], // Southwest corner
  [-82.0, 41.3], // Southeast corner
  [-82.0, 42.9], // Northeast corner
  [-83.5, 42.9], // Northwest corner
];

// Drift Prediction Line (Point A to Point B)
// Point A: Western edge of Lake Erie
// Point B: Eastern edge of Lake Erie
const DRIFT_PREDICTION_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        name: 'Drift Prediction',
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-83.2, 41.6], // Point A
          [-82.3, 42.1], // Point B
        ],
      },
    },
  ],
};

export default function LakeMap() {
  const [viewState, setViewState] = useState({
    longitude: -83.0,
    latitude: 41.85,
    zoom: 8,
  });

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-0 left-0 z-10 p-4 bg-white/90 backdrop-blur-sm">
        <h1 className="text-2xl font-[var(--font-inter)] font-semibold text-gray-900">
          Algae Watch
        </h1>
      </div>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
      >
        <Source
          id="heatmap-overlay"
          type="image"
          url="/demo_heatmap.png"
          coordinates={LAKE_ERIE_BOUNDS}
        >
          <Layer
            id="heatmap-layer"
            type="raster"
            paint={{
              'raster-opacity': 0.6,
            }}
          />
        </Source>
        <Source
          id="drift-prediction"
          type="geojson"
          data={DRIFT_PREDICTION_GEOJSON}
        >
          <Layer
            id="drift-prediction-line"
            type="line"
            paint={{
              'line-color': '#FFD700', // Yellow
              'line-width': 3,
              'line-dasharray': [2, 2], // Dashed pattern
              'line-opacity': 0.8,
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
