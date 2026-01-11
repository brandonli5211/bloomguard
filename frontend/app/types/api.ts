/**
 * API Types for Algae Watch Backend Integration
 * Matches the POST /api/analyze endpoint response format
 */

/**
 * Coordinate pair [lat, lon]
 */
export type Coordinate = [number, number];

/**
 * Request payload for POST /api/analyze
 */
export interface AnalyzeRequest {
  lat: number;
  lon: number;
}

/**
 * Response from POST /api/analyze
 */
export interface AnalyzeResponse {
  /** URL to the satellite image/heatmap */
  image_url: string;
  /** Risk score between 0.0 and 1.0 */
  risk_score: number;
  /** Predicted drift location as [lat, lon] */
  drift_vector: Coordinate;
  /** AI-generated analysis report */
  ai_report: string;
  /** Flight path coordinates as array of [lat, lon] pairs */
  flight_path: Coordinate[];
}
