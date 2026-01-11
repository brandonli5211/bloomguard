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

# --- FIX 1: OPEN CORS (Hackathon Friendly) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Allow all origins to prevent connection issues between partners
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving images
assets_dir = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


# --- FIX 2: ADD DEFAULTS (Lake Erie Safety Net) ---
class AnalyzeRequest(BaseModel):
    lat: float = 41.85
    lon: float = -83.10


class AnalyzeResponse(BaseModel):
    image_url: str
    risk_score: float
    drift_vector: List[float]
    ai_report: str
    flight_path: List[List[float]]


@app.get("/api/status")
async def health_check():
    return {"status": "online", "service": "Algae Watch API", "version": "1.0.0"}


def _lat_lon_to_bbox(lat: float, lon: float, size_degrees: float = 0.1) -> List[float]:
    half_size = size_degrees / 2.0
    min_lon = lon - half_size
    max_lon = lon + half_size
    lat_correction = max(abs(math.cos(math.radians(lat))), 0.01)
    adjusted_lat_size = half_size / lat_correction
    min_lat = max(-90, lat - adjusted_lat_size)
    max_lat = min(90, lat + adjusted_lat_size)
    return [min_lon, min_lat, max_lon, max_lat]


def _calculate_risk_score(lat: float, lon: float) -> float:
    # Placeholder logic
    coastal_proximity = abs(lat)
    mock_score = min(0.8, 0.3 + (coastal_proximity / 90.0) * 0.5)
    return round(mock_score, 2)


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_location(request: AnalyzeRequest):
    try:
        lat = request.lat
        lon = request.lon

        # Validate coordinates
        if not (-90 <= lat <= 90):
            raise HTTPException(status_code=400, detail=f"Invalid latitude: {lat}")
        if not (-180 <= lon <= 180):
            raise HTTPException(status_code=400, detail=f"Invalid longitude: {lon}")

        logger.info(f"Analyzing location: ({lat}, {lon})")

        # 1. Fetch satellite image
        bbox = _lat_lon_to_bbox(lat, lon)
        image_path = fetch_satellite_image(bbox)

        # --- FIX 3: SIMPLIFIED URL LOGIC ---
        # Ensure we serve the file correctly regardless of absolute/relative paths
        filename = os.path.basename(image_path)
        image_url = f"/assets/{filename}"

        # 2. Predict drift
        drift_vector = predict_drift(lat, lon)

        # 3. Calculate risk score
        risk_score = _calculate_risk_score(lat, lon)

        # 4. AI report (placeholder)
        ai_report = ""

        # 5. Flight path (placeholder)
        flight_path: List[List[float]] = []

        response = AnalyzeResponse(
            image_url=image_url,
            risk_score=risk_score,
            drift_vector=drift_vector,
            ai_report=ai_report,
            flight_path=flight_path,
        )

        logger.info(f"Analysis complete for ({lat}, {lon})")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing location: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
