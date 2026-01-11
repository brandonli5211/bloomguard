'use client';

import { useState, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { analyzeLocation } from '../lib/api';
import type { AnalyzeResponse, Coordinate } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Lake Erie approximate bounds for image overlay
// Format: [lon, lat] for each corner: SW, SE, NE, NW
// Updated to better match actual Lake Erie boundaries

const LAKE_ERIE_BOUNDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-81.30, 42.17], // Top Left (North West)
  [-81.20, 42.17], // Top Right (North East)
  [-81.20, 42.07], // Bottom Right (South East)
  [-81.30, 42.07], // Bottom Left (South West)
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
    longitude: -81.25, // Required by react-map-gl (kept as longitude for library compatibility)
    latitude: 42.12,  // Required by react-map-gl (kept as latitude for library compatibility)
    zoom: 10,
  });

  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract lon/lat from viewState for internal use
  const lon = viewState.longitude;
  const lat = viewState.latitude;

  // Fetch analysis data for the center of Lake Erie
  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await analyzeLocation({
          lat: lat,
          lon: lon,
        });
        setAnalysisData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  // Build drift prediction GeoJSON from API response
  const driftGeoJSON = analysisData?.drift_vector
    ? {
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
                [lon, lat], // Starting point [lon, lat]
                [analysisData.drift_vector[1], analysisData.drift_vector[0]], // [lon, lat] from drift_vector [lat, lon]
              ],
            },
          },
        ],
      }
    : DRIFT_PREDICTION_GEOJSON; // Fallback to hardcoded data

  // Use API image URL or fallback to demo
  const heatmapUrl = analysisData?.image_url
    ? `${API_BASE_URL}${analysisData.image_url}`
    : '/demo_heatmap.png';

  return (
    <div className="relative w-full h-screen bg-slate-50">
      <div className="absolute top-0 left-0 z-10 p-4 bg-slate-50/95 backdrop-blur-sm border-b border-r border-slate-200/60 shadow-sm">
        <h1 className="text-2xl font-[var(--font-inter)] font-semibold text-slate-700 mb-2">
          Bloomguard
        </h1>
        {analysisData && (
          <div className="text-sm text-slate-600">
            <p>Risk Score: <span className="font-semibold">{(analysisData.risk_score * 100).toFixed(0)}%</span></p>
          </div>
        )}
        {loading && <p className="text-xs text-slate-500 mt-1">Loading analysis...</p>}
        {error && <p className="text-xs text-red-600 mt-1">Error: {error}</p>}
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
          url={heatmapUrl}
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
          data={driftGeoJSON}
        >
          <Layer
            id="drift-prediction-line"
            type="line"
            paint={{
              'line-color': '#7DD3FC', // Light blue
              'line-width': 3,
              'line-dasharray': [2, 2], // Dashed pattern
              'line-opacity': 0.7,
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
