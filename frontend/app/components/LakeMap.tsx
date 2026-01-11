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

// Updated to a tight 2km box around the center point (-81.25, 42.12)
const LAKE_ERIE_BOUNDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-81.26, 42.13], // Top Left
  [-81.24, 42.13], // Top Right
  [-81.24, 42.11], // Bottom Right
  [-81.26, 42.11], // Bottom Left
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
  // Store the actual analyzed location (not viewState which can change when panning)
  const [analyzedLocation, setAnalyzedLocation] = useState<{ lat: number; lon: number } | null>(null);

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
        // Store the actual location that was analyzed
        setAnalyzedLocation({ lat, lon });
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
  // Use the actual analyzed location as the start point, not the current viewState center
  const driftGeoJSON = analysisData?.drift_vector && analyzedLocation
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
                [analyzedLocation.lon, analyzedLocation.lat], // Starting point from actual analyzed location [lon, lat]
                [analysisData.drift_vector[1], analysisData.drift_vector[0]], // Predicted drift location [lon, lat] from drift_vector [lat, lon]
              ],
            },
          },
        ],
      }
    : DRIFT_PREDICTION_GEOJSON; // Fallback to hardcoded data
    
  // Port Stanley, Ontario - Home base for drone deployment
  const PORT_STANLEY_LAT = 42.66;
  const PORT_STANLEY_LON = -81.22;

  // Build flight path: Backend now returns Port Stanley → Algae → Zigzag pattern
  const flightPathGeoJSON = analysisData?.flight_path
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { name: 'Drone Path' },
            geometry: {
              type: 'LineString' as const,
              // Backend sends [lat, lon], Mapbox expects [lon, lat]
              coordinates: analysisData.flight_path.map((p) => [p[1], p[0]]),
            },
          },
        ],
      }
    : null;

  // Port Stanley marker GeoJSON
  const portStanleyMarker = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: { name: 'Port Stanley - Home Base' },
        geometry: {
          type: 'Point' as const,
          coordinates: [PORT_STANLEY_LON, PORT_STANLEY_LAT],
        },
      },
    ],
  };

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
              {/* AI ANALYST DISPLAY */}
              {analysisData?.ai_report && (
            <div className="mt-4 p-3 bg-slate-800 rounded border-l-4 border-red-500 shadow-sm max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                 <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                   AI Tactical Report
                 </span>
              </div>
              <p className="text-xs font-mono text-green-400 leading-relaxed">
                {analysisData.ai_report}
              </p>
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
        {/* Port Stanley Home Base Marker */}
        <Source id="port-stanley-marker" type="geojson" data={portStanleyMarker}>
          <Layer
            id="port-stanley-circle"
            type="circle"
            paint={{
              'circle-radius': 10,
              'circle-color': '#1F2937', // Dark gray/black
              'circle-opacity': 1.0,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
        </Source>
        {/* PHASE 4: Drone Flight Path Layer - Purple dashed line from Port Stanley → Algae → Zigzag */}
        {flightPathGeoJSON && (
          <Source id="flight-path" type="geojson" data={flightPathGeoJSON}>
            <Layer
              id="flight-path-line"
              type="line"
              paint={{
                'line-color': '#06B6D4', // Vibrant cyan/teal for drone path
                'line-width': 4,
                'line-opacity': 0.9,
                'line-dasharray': [4, 2], // Dashed pattern
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </Source>
        )}
        {/* Drift Prediction Arrow - Rendered AFTER flight path to overlap on top */}
        <Source
          id="drift-prediction"
          type="geojson"
          data={driftGeoJSON}
        >
          <Layer
            id="drift-prediction-line"
            type="line"
            paint={{
              'line-color': '#3B82F6', // Bright blue for visibility
              'line-width': 10, // Thick arrow shaft
              'line-opacity': 1.0, // Fully opaque
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          {/* Arrow head at the end point */}
          {analysisData?.drift_vector && analyzedLocation && (
            <Source
              id="drift-arrow-head"
              type="geojson"
              data={{
                type: 'FeatureCollection' as const,
                features: [
                  {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: {
                      type: 'Point' as const,
                      coordinates: [analysisData.drift_vector[1], analysisData.drift_vector[0]], // [lon, lat]
                    },
                  },
                ],
              }}
            >
              <Layer
                id="drift-arrow-marker"
                type="circle"
                paint={{
                  'circle-radius': 16, // Larger arrowhead for visibility
                  'circle-color': '#3B82F6', // Bright blue
                  'circle-opacity': 1.0,
                  'circle-stroke-width': 4, // Thick white border for contrast
                  'circle-stroke-color': '#FFFFFF',
                }}
              />
            </Source>
          )}
        </Source>
      </Map>
    </div>
  );
}
