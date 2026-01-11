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

// Updated to a ~3km box centered on (-81.25, 42.12)
const LAKE_ERIE_BOUNDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-81.265, 42.135], // Top Left
  [-81.235, 42.135], // Top Right
  [-81.235, 42.105], // Bottom Right
  [-81.265, 42.105], // Bottom Left
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
  // Target location (Lake Erie)
  const TARGET_LON = -81.25;
  const TARGET_LAT = 42.12;
  const TARGET_ZOOM = 13;

  // Start zoomed out (globe view)
  const [viewState, setViewState] = useState({
    longitude: 0, // Center of globe
    latitude: 0,   // Center of globe
    zoom: 1,      // Very zoomed out to show globe
    bearing: 0,   // Starting rotation
    pitch: 0,     // Starting pitch
  });

  const [isAnimating, setIsAnimating] = useState(true);

  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store the actual analyzed location (not viewState which can change when panning)
  const [analyzedLocation, setAnalyzedLocation] = useState<{ lat: number; lon: number } | null>(null);
  
  // Animation state for drone path
  const [dashOffset, setDashOffset] = useState(0);
  
  // State for minimizing tactical record (starts minimized)
  const [isTacticalRecordMinimized, setIsTacticalRecordMinimized] = useState(true);
  
  // State for minimizing legend (starts minimized)
  const [isLegendMinimized, setIsLegendMinimized] = useState(true);

  // Fetch analysis data for the target location (Lake Erie)
  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await analyzeLocation({
          lat: TARGET_LAT,
          lon: TARGET_LON,
        });
        setAnalysisData(response);
        // Store the actual location that was analyzed
        setAnalyzedLocation({ lat: TARGET_LAT, lon: TARGET_LON });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  // Animate map from globe view to target location
  useEffect(() => {
    // Phase 1: Rotate and move to position above Lake Erie (2.5 seconds)
    // Phase 2: Zoom into Lake Erie from above (2 seconds)
    // Phase 3: Tilt camera to align with path (1.5 seconds)
    const rotationDuration = 2500;
    const zoomDuration = 2000;
    const tiltDuration = 1500;
    
    // Start animation after a brief delay to let map load
    const timeout = setTimeout(() => {
      // Calculate bearing to target location from center of globe
      const calculateBearingToTarget = (startLon: number, startLat: number, endLon: number, endLat: number): number => {
        const dLon = (endLon - startLon) * Math.PI / 180;
        const startLatRad = startLat * Math.PI / 180;
        const endLatRad = endLat * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(endLatRad);
        const x = Math.cos(startLatRad) * Math.sin(endLatRad) - 
                  Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(dLon);
        
        const bearing = Math.atan2(y, x);
        return (bearing * 180 / Math.PI + 360) % 360;
      };

      const targetBearing = calculateBearingToTarget(0, 0, TARGET_LON, TARGET_LAT);
      const startTime = Date.now();
      const startZoom = 1;
      const startLon = 0;
      const startLat = 0;
      const startBearing = 0;
      
      // Position above Lake Erie (slightly north for better view)
      const aboveLakeLat = TARGET_LAT + 0.5; // Position slightly north of Lake Erie
      const aboveLakeLon = TARGET_LON;
      const aboveLakeZoom = 3; // Zoomed out but positioned above the lake

      // Phase 1: Rotate and move to position above Lake Erie
      const rotateToAboveTarget = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / rotationDuration, 1);
        
        // Easing function (ease-in-out)
        const easeInOut = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolate bearing
        const currentBearing = startBearing + (targetBearing - startBearing) * easeInOut;
        
        // Interpolate position to above Lake Erie
        const currentLon = startLon + (aboveLakeLon - startLon) * easeInOut;
        const currentLat = startLat + (aboveLakeLat - startLat) * easeInOut;
        
        // Slightly zoom in as we move (but stay zoomed out)
        const currentZoom = startZoom + (aboveLakeZoom - startZoom) * easeInOut;

        setViewState({
          longitude: currentLon,
          latitude: currentLat,
          zoom: currentZoom,
          bearing: currentBearing,
          pitch: 0,
        });

        if (progress < 1) {
          requestAnimationFrame(rotateToAboveTarget);
        } else {
          // Phase 2: Zoom into Lake Erie from above
          const zoomStartTime = Date.now();
          
          const zoomToTarget = () => {
            const zoomElapsed = Date.now() - zoomStartTime;
            const zoomProgress = Math.min(zoomElapsed / zoomDuration, 1);
            
            // Easing function (ease-in-out)
            const zoomEaseInOut = zoomProgress < 0.5
              ? 2 * zoomProgress * zoomProgress
              : 1 - Math.pow(-2 * zoomProgress + 2, 2) / 2;

            // Interpolate zoom from above-lake position to target zoom
            const currentZoom = aboveLakeZoom + (TARGET_ZOOM - aboveLakeZoom) * zoomEaseInOut;
            
            // Move position from above Lake Erie to centered on Lake Erie
            const currentLon = aboveLakeLon + (TARGET_LON - aboveLakeLon) * zoomEaseInOut;
            const currentLat = aboveLakeLat + (TARGET_LAT - aboveLakeLat) * zoomEaseInOut;

            setViewState({
              longitude: currentLon,
              latitude: currentLat,
              zoom: currentZoom,
              bearing: targetBearing, // Keep the rotation
              pitch: 0,
            });

            if (zoomProgress < 1) {
              requestAnimationFrame(zoomToTarget);
            } else {
              // Phase 3: Tilt camera to align with path
              const tiltStartTime = Date.now();
              const startPitch = 0;
              const targetPitch = 60; // Tilt 60 degrees for better path alignment
              
              const tiltCamera = () => {
                const tiltElapsed = Date.now() - tiltStartTime;
                const tiltProgress = Math.min(tiltElapsed / tiltDuration, 1);
                
                // Easing function (ease-in-out)
                const tiltEaseInOut = tiltProgress < 0.5
                  ? 2 * tiltProgress * tiltProgress
                  : 1 - Math.pow(-2 * tiltProgress + 2, 2) / 2;

                // Interpolate pitch
                const currentPitch = startPitch + (targetPitch - startPitch) * tiltEaseInOut;

                setViewState({
                  longitude: TARGET_LON,
                  latitude: TARGET_LAT,
                  zoom: TARGET_ZOOM,
                  bearing: targetBearing,
                  pitch: currentPitch,
                });

                if (tiltProgress < 1) {
                  requestAnimationFrame(tiltCamera);
                } else {
                  setIsAnimating(false);
                }
              };

              requestAnimationFrame(tiltCamera);
            }
          };

          requestAnimationFrame(zoomToTarget);
        }
      };

      requestAnimationFrame(rotateToAboveTarget);
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, []); // Run only once on mount

  // Animation loop for drone path (animated dashes)
  useEffect(() => {
    const interval = setInterval(() => {
      setDashOffset((prev) => (prev + 1) % 6); // Cycle through dash pattern
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
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

  // Get risk score color based on percentage
  const getRiskScoreColor = (score: number): string => {
    const percentage = score * 100;
    if (percentage < 25) {
      return 'text-green-600'; // Low risk - green (0-25%)
    } else if (percentage < 50) {
      return 'text-yellow-600'; // Medium risk - yellow (25-50%)
    } else {
      return 'text-red-600'; // High risk - red (50-100%)
    }
  };

  
  return (
    <div className="relative w-full h-screen bg-slate-50">
      <div className="absolute top-0 left-0 z-10 p-4 bg-slate-50/95 backdrop-blur-sm border-b border-r border-slate-200/60 shadow-sm">
        <h1 className="text-2xl font-[var(--font-inter)] font-semibold text-slate-700 mb-2">
          Bloomguard
        </h1>
        {analysisData && (
          <div className="text-sm">
            <p className="text-slate-600">
              Risk Score: <span className={`font-bold ${getRiskScoreColor(analysisData.risk_score)}`}>{(analysisData.risk_score * 100).toFixed(0)}%</span>
            </p>
          </div>
        )}
              {/* TACTICAL RECORD DISPLAY */}
              {analysisData?.ai_report && (
            <div className="mt-4 bg-slate-800 rounded border-l-4 border-red-500 shadow-sm max-w-sm">
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Tactical Report
                  </span>
                </div>
                <button
                  onClick={() => setIsTacticalRecordMinimized(!isTacticalRecordMinimized)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                  aria-label={isTacticalRecordMinimized ? "Expand" : "Minimize"}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${isTacticalRecordMinimized ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!isTacticalRecordMinimized && (
                <div className="px-3 pb-3">
                  <p className="text-xs font-mono text-green-400 leading-relaxed">
                    {analysisData.ai_report}
                  </p>
                </div>
              )}
            </div>
          )}

        {loading && <p className="text-xs text-slate-500 mt-1">Loading analysis...</p>}
        {error && <p className="text-xs text-red-600 mt-1">Error: {error}</p>}
      </div>
      <Map
        {...viewState}
        onMove={(evt) => {
          // Only allow manual pan/zoom after animation completes
          if (!isAnimating) {
            setViewState(evt.viewState);
          }
        }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        // Custom map styling to match muted UI theme
        onLoad={(e) => {
          const map = e.target;
          
          // Helper function to safely set paint property
          const safeSetPaintProperty = (layerId: string, property: any, value: string) => {
            try {
              const layer = map.getLayer(layerId);
              if (layer) {
                map.setPaintProperty(layerId, property, value);
              }
            } catch (err) {
              console.warn(`Could not set ${property} for layer ${layerId}:`, err);
            }
          };

          // Customize water color to match muted blue theme
          safeSetPaintProperty('water', 'fill-color', '#E0F2FE'); // muted-blue-100
          
          // Customize land/background to match slate theme
          safeSetPaintProperty('land', 'fill-color', '#F8FAFC'); // slate-50
          
          // Mute the background
          safeSetPaintProperty('background', 'background-color', '#F8FAFC'); // slate-50
          
          // Soften road colors (these layer names may vary by style)
          safeSetPaintProperty('road-street', 'line-color', '#E2E8F0'); // muted-gray-200
          safeSetPaintProperty('road-primary', 'line-color', '#CBD5E1'); // muted-gray-300
          
          // Mute building colors
          safeSetPaintProperty('building', 'fill-color', '#F1F5F9'); // slate-100
        }}
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
        {/* PHASE 4: Drone Flight Path Layer - Animated dashed line from Port Stanley → Algae → Zigzag */}
        {flightPathGeoJSON && (
          <Source id="flight-path" type="geojson" data={flightPathGeoJSON}>
            <Layer
              id="flight-path-line"
              type="line"
              paint={{
                'line-color': '#06B6D4', // Vibrant cyan/teal for drone path
                'line-width': 4 + Math.sin(dashOffset * 0.5) * 0.5, // Subtle animated width
                'line-opacity': 0.9,
                'line-dasharray': [4 + dashOffset * 0.3, 2 - dashOffset * 0.1], // Animated dash pattern
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
      
      {/* Legend Pane - Bottom Right */}
      <div className={`absolute bottom-0 right-0 z-10 bg-slate-50/95 backdrop-blur-sm border-t border-l border-slate-200/60 shadow-sm ${isLegendMinimized ? 'p-2' : 'p-4 max-w-sm'}`}>
        <div className={`flex items-center ${isLegendMinimized ? 'justify-center' : 'justify-between'} gap-2 ${isLegendMinimized ? '' : 'mb-3'}`}>
          <h2 className={`font-[var(--font-inter)] font-semibold text-slate-700 ${isLegendMinimized ? 'text-sm' : 'text-lg'}`}>
            Legend
          </h2>
          <button
            onClick={() => setIsLegendMinimized(!isLegendMinimized)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label={isLegendMinimized ? "Expand" : "Minimize"}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isLegendMinimized ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {!isLegendMinimized && (
          <div className="space-y-4">
            {/* Risk Score Colors */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Risk Score
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-600"></div>
                  <span className="text-xs text-slate-600">Low (0-25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-600"></div>
                  <span className="text-xs text-slate-600">Medium (25-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-600"></div>
                  <span className="text-xs text-slate-600">High (50-100%)</span>
                </div>
              </div>
            </div>
            
            {/* Map Elements */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Map Elements
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(to right, #f97316, #dc2626)' }}></div>
                  <span className="text-xs text-slate-600">Algae Heatmap</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-cyan-500 bg-cyan-500/20"></div>
                  <span className="text-xs text-slate-600">Drone Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 bg-blue-500/20"></div>
                  <span className="text-xs text-slate-600">Drift Prediction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-700 border-2 border-white"></div>
                  <span className="text-xs text-slate-600">Home Base</span>
                </div>
              </div>
            </div>
            
            {/* Data Sources */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Data Sources
              </h3>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div>• Sentinel Hub (Satellite Imagery)</div>
                <div>• Weather API (Wind & Currents)</div>
                <div>• Google Generative AI (Analysis)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
