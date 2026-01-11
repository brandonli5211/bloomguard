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
from services.mission import generate_flight_path

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

    # 1. Fetch Real Wind Data
    wind_speed, wind_deg = get_wind_data(request.lat, request.lon)

    # 2. Dynamic Risk Calculation
    calculated_risk = 0.90 - (wind_speed * 0.02)
    risk_score = max(0.10, min(0.95, calculated_risk))

    # 3. Calculate Drift Vector
    drift_vec = predict_drift(request.lat, request.lon)

    # --- PHASE 4 NEW LOGIC STARTS HERE ---

    # 4. Generate Drone Flight Path
    # Path starts from Port Stanley, goes to algae location, then zigzags along drift
    flight_path = generate_flight_path(
        request.lat, request.lon, drift_vec[0], drift_vec[1]
    )

    # 5. Enhance the AI Report
    # We append a tactical note so the text matches the orange line on the map
    mission_text = "\nTACTICAL PLAN: Drone Intercept Pattern Generated (Zig-Zag Grid)."

    # Generate the base report
    ai_text = generate_situation_report(risk_score, wind_speed, wind_deg)

    # Combine them
    full_report = f"{ai_text}{mission_text}"

    # --- PHASE 4 NEW LOGIC ENDS HERE ---

    return AnalyzeResponse(
        image_url="/assets/demo_heatmap.png",
        risk_score=risk_score,
        drift_vector=drift_vec,
        ai_report=full_report,  # Sending the enhanced text
        flight_path=flight_path,  # Sending the real flight coordinates
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
