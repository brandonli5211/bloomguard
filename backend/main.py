from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import os
import math
import logging

# Import services
from services.sentinel import fetch_satellite_image
from services.drift import predict_drift

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Algae Watch API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving images
assets_dir = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(assets_dir, exist_ok=True)  # Create directory if it doesn't exist
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Pydantic Models
class AnalyzeRequest(BaseModel):
    lat: float
    lon: float


class AnalyzeResponse(BaseModel):
    image_url: str
    risk_score: float
    drift_vector: List[float]
    ai_report: str
    flight_path: List[List[float]]


@app.get("/api/status")
async def health_check():
    """Health check endpoint to verify API status."""
    return {
        "status": "online",
        "service": "Algae Watch API",
        "version": "1.0.0"
    }


def _lat_lon_to_bbox(lat: float, lon: float, size_degrees: float = 0.1) -> List[float]:
    """
    Convert a latitude/longitude point to a bounding box.
    
    Args:
        lat: Center latitude
        lon: Center longitude
        size_degrees: Size of bounding box in degrees (default: 0.1 = ~11km)
    
    Returns:
        List[float]: Bounding box as [min_x, min_y, max_x, max_y]
    """
    half_size = size_degrees / 2.0
    
    min_lon = lon - half_size
    max_lon = lon + half_size
    
    # Adjust latitude range based on longitude to maintain approximate square shape
    # At higher latitudes, degrees of longitude shrink, so we adjust accordingly
    lat_correction = max(abs(math.cos(math.radians(lat))), 0.01)
    adjusted_lat_size = half_size / lat_correction
    
    min_lat = max(-90, lat - adjusted_lat_size)
    max_lat = min(90, lat + adjusted_lat_size)
    
    return [min_lon, min_lat, max_lon, max_lat]


def _calculate_risk_score(lat: float, lon: float) -> float:
    """
    Calculate a risk score for the given location.
    
    For Phase 1, this is a placeholder calculation.
    In a full implementation, this would analyze the satellite image
    for NDCI values or use AI to assess bloom severity.
    
    Args:
        lat: Latitude
        lon: Longitude
    
    Returns:
        float: Risk score between 0.0 and 1.0
    """
    # Placeholder: Simple mock calculation based on location
    # Higher risk near common bloom areas (coastal regions, lakes)
    # This will be replaced with actual NDCI analysis in later phases
    
    # For now, return a mock score between 0.0 and 1.0
    # Based on coastal proximity (simplified)
    coastal_proximity = abs(lat)  # Simple heuristic
    mock_score = min(0.8, 0.3 + (coastal_proximity / 90.0) * 0.5)
    
    return round(mock_score, 2)


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_location(request: AnalyzeRequest):
    """
    Analyze a location for algae bloom risk and predict drift.
    
    Accepts latitude and longitude, returns:
    - image_url: Path to satellite imagery heatmap
    - risk_score: Risk assessment (0.0 to 1.0)
    - drift_vector: Predicted drift position [lat, lon]
    - ai_report: AI-generated analysis report (placeholder for Phase 2)
    - flight_path: Recommended flight path for monitoring (placeholder)
    """
    try:
        lat = request.lat
        lon = request.lon
        
        # Validate coordinates
        if not (-90 <= lat <= 90):
            raise HTTPException(status_code=400, detail=f"Invalid latitude: {lat}. Must be between -90 and 90.")
        
        if not (-180 <= lon <= 180):
            raise HTTPException(status_code=400, detail=f"Invalid longitude: {lon}. Must be between -180 and 180.")
        
        logger.info(f"Analyzing location: ({lat}, {lon})")
        
        # 1. Fetch satellite image
        bbox = _lat_lon_to_bbox(lat, lon)
        image_path = fetch_satellite_image(bbox)
        
        # Convert local path to URL path for frontend access
        # Extract filename from full path and construct URL
        filename = os.path.basename(image_path)
        
        # If the file is in the assets directory, serve via static files endpoint
        # Otherwise, return the path as-is (will need to be handled differently)
        if os.path.dirname(image_path).endswith("assets") or "assets" in image_path:
            image_url = f"/assets/{filename}"
        else:
            # Fallback: return relative path (may need adjustment for production)
            image_url = f"/assets/{filename}"  # Try assets anyway
        
        # 2. Predict drift
        drift_vector = predict_drift(lat, lon)
        
        # 3. Calculate risk score
        risk_score = _calculate_risk_score(lat, lon)
        
        # 4. AI report (placeholder - will be implemented with Gemini in Phase 2)
        ai_report = ""
        
        # 5. Flight path (placeholder - will be implemented in Phase 2)
        flight_path: List[List[float]] = []
        
        # Construct response matching exact JSON structure
        response = AnalyzeResponse(
            image_url=image_url,
            risk_score=risk_score,
            drift_vector=drift_vector,
            ai_report=ai_report,
            flight_path=flight_path,
        )
        
        logger.info(f"Analysis complete for ({lat}, {lon}): risk={risk_score}, drift={drift_vector}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing location ({request.lat}, {request.lon}): {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
