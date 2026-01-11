from dotenv import load_dotenv
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import math
import logging
from services.ai_analyst import generate_situation_report

# Import services
from services.sentinel import fetch_satellite_image
from services.drift import predict_drift, get_wind_data

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
    logger.info(f"Analyzing location: ({request.lat}, {request.lon})")

    # 1. Fetch Real Environmental Data
    # We call this explicitly so we can use the wind speed in our math
    wind_speed, wind_deg = get_wind_data(request.lat, request.lon)

    # 2. Dynamic Algorithm: "Turbulence-Toxicity Correlation"
    # Logic: Stagnant water (low wind) promotes bloom growth.
    # High wind breaks up the surface scum, lowering immediate risk.
    # Base risk is 90%. We subtract 2% risk for every 1 km/h of wind.
    calculated_risk = 0.90 - (wind_speed * 0.02)

    # Clamp the result so it stays between 0.10 and 0.95
    # (We never want it to be 0% or >100%)
    risk_score = max(0.10, min(0.95, calculated_risk))

    # 3. Calculate Drift Vector
    drift_vec = predict_drift(request.lat, request.lon)

    # 4. AI Commander Analysis
    # We pass the calculated numbers to Gemini for the "Human" report
    ai_text = generate_situation_report(risk_score, wind_speed, wind_deg)

    return AnalyzeResponse(
        image_url="/assets/demo_heatmap.png",
        risk_score=risk_score,
        drift_vector=drift_vec,
        ai_report=ai_text,
        flight_path=[],
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
