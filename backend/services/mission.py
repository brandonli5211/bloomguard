from typing import List
import math

# Port Stanley, Ontario - Home base for drone deployment
PORT_STANLEY_LAT = 42.66
PORT_STANLEY_LON = -81.22


def generate_flight_path(
    algae_lat: float, algae_lon: float, drift_lat: float, drift_lon: float
) -> List[List[float]]:
    """
    Generates a drone flight path that:
    1. Starts from Port Stanley home base
    2. Flies directly to the algal bloom location
    3. Then zigzags along the predicted drift path to cover/disperse the bloom area
    
    The zigzag pattern is perpendicular to the drift direction and follows the drift vector.
    
    Args:
        algae_lat, algae_lon: Location where algae bloom is detected
        drift_lat, drift_lon: Predicted drift location after wind influence
    
    Returns a list of [lat, lon] coordinates.
    """
    path = []

    # PHASE 1: Deployment from Port Stanley to Algae Bloom
    path.append([PORT_STANLEY_LAT, PORT_STANLEY_LON])  # Home base
    path.append([algae_lat, algae_lon])  # Reach algae bloom location

    # PHASE 2: Zigzag dispersal pattern along predicted drift path
    # Number of segments along the drift vector
    steps = 8  # More steps for smoother coverage

    # Calculate drift vector direction (bearing in radians)
    dlat = drift_lat - algae_lat
    dlon = drift_lon - algae_lon
    
    # Calculate bearing of drift direction
    drift_bearing = math.atan2(
        dlon * math.cos(math.radians(algae_lat)),
        dlat
    )
    
    # Perpendicular direction (90 degrees to drift) for zigzag
    perp_bearing = drift_bearing + (math.pi / 2)
    
    # Step size along the drift vector
    lat_step = dlat / steps
    lon_step = dlon / steps
    
    # Zigzag width (perpendicular to drift direction)
    # 0.015 degrees ≈ 1.5km width for coverage
    width_km = 1.5
    width_degrees = width_km / 111.0  # Approximate conversion

    # Generate zigzag pattern along drift path
    for i in range(1, steps + 1):
        # Calculate center point along drift line
        center_lat = algae_lat + (lat_step * i)
        center_lon = algae_lon + (lon_step * i)
        
        # Calculate perpendicular offset for zigzag
        # Account for latitude when calculating longitude offset
        perp_lat_offset = width_degrees * math.cos(perp_bearing)
        perp_lon_offset = width_degrees * math.sin(perp_bearing) / math.cos(math.radians(center_lat))
        
        # Zig (one side perpendicular to drift)
        zig_lat = center_lat + perp_lat_offset
        zig_lon = center_lon + perp_lon_offset
        path.append([zig_lat, zig_lon])
        
        # Zag (other side perpendicular to drift)
        zag_lat = center_lat - perp_lat_offset
        zag_lon = center_lon - perp_lon_offset
        path.append([zag_lat, zag_lon])

    return path
