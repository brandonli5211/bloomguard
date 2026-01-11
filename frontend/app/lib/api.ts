/**
 * API Client for Algae Watch Backend
 * Handles communication with POST /api/analyze endpoint
 */

import type { AnalyzeRequest, AnalyzeResponse } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Calls the POST /api/analyze endpoint
 * @param request - Request payload with lat and lon
 * @returns Promise with the analysis response
 */
export async function analyzeLocation(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: AnalyzeResponse = await response.json();
  return data;
}
