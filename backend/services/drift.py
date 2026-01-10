"""
Drift prediction service for forecasting algae bloom movement.
Uses marine weather data to predict drift vectors based on wind patterns.
"""
import math
import requests
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# Open-Meteo Marine API endpoint
MARINE_API_URL = "https://marine-api.open-meteo.com/v1/marine"


def predict_drift(lat: float, lon: float) -> List[float]:
    """
    Predict the drift position of an algae bloom based on wind conditions.
    
    Uses the Open-Meteo Marine API to fetch wind speed and direction,
    then calculates the predicted position after 24 hours of drift.
    
    Formula:
        New Lat = Old Lat + (WindSpeed * 0.03 * Cos(WindDir) * 24 hours)
        New Lon = Old Lon + (WindSpeed * 0.03 * Sin(WindDir) * 24 hours)
    
    Args:
        lat: Current latitude (degrees, -90 to 90)
        lon: Current longitude (degrees, -180 to 180)
    
    Returns:
        List[float]: Predicted position as [new_lat, new_lon]
                    Returns [lat, lon] unchanged if API fails or data unavailable
    """
    # Validate input coordinates
    if not (-90 <= lat <= 90):
        logger.warning(f"Invalid latitude: {lat}, must be between -90 and 90")
        return [lat, lon]
    
    if not (-180 <= lon <= 180):
        logger.warning(f"Invalid longitude: {lon}, must be between -180 and 180")
        return [lat, lon]
    
    try:
        # Fetch wind data from Open-Meteo Marine API
        wind_data = _fetch_wind_data(lat, lon)
        
        if not wind_data:
            logger.warning(f"Could not fetch wind data for ({lat}, {lon}), returning original position")
            return [lat, lon]
        
        wind_speed = wind_data.get("wind_speed", 0.0)  # m/s
        wind_direction = wind_data.get("wind_direction", 0.0)  # degrees (0-360, 0=North, 90=East)
        
        if wind_speed <= 0:
            logger.info(f"No wind or invalid wind speed ({wind_speed}) at ({lat}, {lon})")
            return [lat, lon]
        
        # Convert wind direction from degrees to radians
        # Note: Wind direction is where wind comes FROM (meteorological convention)
        # For drift, we need direction where it's going TO, so add 180 degrees
        wind_direction_rad = math.radians(wind_direction + 180)
        
        # Calculate drift using the provided formula
        # Distance factor: 0.03 * 24 hours = 0.72 (converts m/s to approximate degrees)
        # Note: This is a simplified model. Actual conversion depends on latitude.
        drift_factor = 0.03 * 24  # Convert m/s drift over 24 hours
        
        # Calculate displacement in degrees
        # Cos for latitude (North-South component)
        # Sin for longitude (East-West component)
        lat_displacement = wind_speed * drift_factor * math.cos(wind_direction_rad)
        lon_displacement = wind_speed * drift_factor * math.sin(wind_direction_rad)
        
        # Adjust longitude displacement based on latitude (degrees of longitude shrink near poles)
        lat_correction = math.cos(math.radians(lat))
        lon_displacement = lon_displacement / max(lat_correction, 0.01)  # Avoid division by zero
        
        # Calculate new position
        new_lat = lat + lat_displacement
        new_lon = lon + lon_displacement
        
        # Normalize longitude to -180 to 180 range
        if new_lon > 180:
            new_lon -= 360
        elif new_lon < -180:
            new_lon += 360
        
        # Clamp latitude to valid range
        new_lat = max(-90, min(90, new_lat))
        
        logger.info(
            f"Drift prediction for ({lat}, {lon}): "
            f"Wind {wind_speed:.2f} m/s from {wind_direction:.1f}° -> "
            f"Predicted position ({new_lat:.6f}, {new_lon:.6f})"
        )
        
        return [new_lat, new_lon]
        
    except Exception as e:
        logger.error(f"Error predicting drift for ({lat}, {lon}): {e}")
        return [lat, lon]


def _fetch_wind_data(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch wind speed and direction from Open-Meteo Marine API.
    
    Args:
        lat: Latitude
        lon: Longitude
    
    Returns:
        dict: Dictionary with 'wind_speed' (m/s) and 'wind_direction' (degrees)
              Returns None if API call fails
    """
    try:
        # Open-Meteo Marine API parameters
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "wind_speed_10m,wind_direction_10m",
            "timezone": "auto",
            "forecast_days": 1,  # Get forecast for next 24 hours
        }
        
        response = requests.get(MARINE_API_URL, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract current wind data from hourly forecast
        hourly = data.get("hourly", {})
        wind_speeds = hourly.get("wind_speed_10m", [])
        wind_directions = hourly.get("wind_direction_10m", [])
        
        if not wind_speeds or not wind_directions:
            logger.warning("No wind data in API response")
            return None
        
        # Filter out None values and convert to floats
        valid_speeds = [float(s) for s in wind_speeds if s is not None]
        valid_directions = [float(d) for d in wind_directions if d is not None]
        
        if not valid_speeds or not valid_directions:
            logger.warning("All wind data values are None - location may not have marine forecast data")
            return None
        
        # Use the first valid forecasted value (current/next hour)
        wind_speed = valid_speeds[0]
        wind_direction = valid_directions[0]
        
        # Average over available hours for more stable prediction (if multiple valid values)
        if len(valid_speeds) > 1:
            wind_speed = sum(valid_speeds[:24]) / min(len(valid_speeds), 24)
            # For direction, use circular mean
            wind_direction = _circular_mean(valid_directions[:24])
        
        return {
            "wind_speed": wind_speed,
            "wind_direction": wind_direction,
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching wind data from Open-Meteo API: {e}")
        return None
    except (KeyError, ValueError, IndexError) as e:
        logger.error(f"Error parsing wind data from API response: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching wind data: {e}")
        return None


def _circular_mean(directions: List[float]) -> float:
    """
    Calculate circular mean of wind directions (handles 0-360 degree wrap-around).
    
    Args:
        directions: List of wind directions in degrees
    
    Returns:
        float: Circular mean direction in degrees (0-360)
    """
    if not directions:
        return 0.0
    
    # Convert to radians and calculate vector components
    radians = [math.radians(float(d)) for d in directions]
    sin_sum = sum(math.sin(r) for r in radians)
    cos_sum = sum(math.cos(r) for r in radians)
    
    # Calculate mean angle
    mean_rad = math.atan2(sin_sum / len(radians), cos_sum / len(radians))
    mean_deg = math.degrees(mean_rad)
    
    # Normalize to 0-360 range
    if mean_deg < 0:
        mean_deg += 360
    
    return mean_deg
