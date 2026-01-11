import httpx
import math
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)


def get_wind_data(lat: float, lon: float) -> Tuple[float, float]:
    """
    Fetches wind speed (km/h) and direction (degrees) from Open-Meteo.
    Uses the Standard Weather API because Marine API often fails for Lakes.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["wind_speed_10m", "wind_direction_10m"],
        "wind_speed_unit": "kmh",
    }

    try:
        # We use a timeout so it doesn't hang the server
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            # Extract current conditions
            current = data.get("current", {})
            wind_speed = current.get("wind_speed_10m")
            wind_dir = current.get("wind_direction_10m")

            if wind_speed is None or wind_dir is None:
                logger.warning(f"No wind data found for ({lat}, {lon})")
                return 0.0, 0.0

            return float(wind_speed), float(wind_dir)

    except Exception as e:
        logger.error(f"Failed to fetch wind data: {e}")
        return 0.0, 0.0


def predict_drift(lat: float, lon: float) -> List[float]:
    """
    Calculates a simple drift vector based on current wind.
    """
    # 1. Get real wind data
    wind_speed, wind_deg = get_wind_data(lat, lon)

    logger.info(f"Wind Data: {wind_speed} km/h at {wind_deg}°")

    # 2. If no wind (API fail), return original spot
    if wind_speed == 0:
        return [lat, lon]

    # 3. Calculate Drift (Simple Physics Model)
    # Rule of thumb: Surface drift is ~3% of wind speed
    # We pretend 1 hour has passed
    drift_speed_kmh = wind_speed * 0.03
    distance_km = drift_speed_kmh * 1.0  # 1 hour duration

    # 4. Convert Distance to Degrees (Rough Approximation)
    # 1 degree lat approx 111km
    degree_dist = distance_km / 111.0

    # Calculate new position
    # Wind comes FROM a direction, drift goes TO the opposite
    drift_dir_rad = math.radians(wind_deg - 180)

    delta_lat = degree_dist * math.cos(drift_dir_rad)
    delta_lon = degree_dist * math.sin(drift_dir_rad)

    new_lat = lat + delta_lat
    new_lon = lon + delta_lon

    return [new_lat, new_lon]
