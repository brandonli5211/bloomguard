from typing import List


def generate_flight_path(
    start_lat: float, start_lon: float, drift_lat: float, drift_lon: float
) -> List[List[float]]:
    """
    Generates a 'Zig-Zag' interception pattern along the drift vector.
    Returns a list of [lat, lon] coordinates.
    """
    path = []

    # 1. Number of 'zigs' in the pattern
    steps = 5

    # 2. Calculate the step size along the main drift line
    lat_step = (drift_lat - start_lat) / steps
    lon_step = (drift_lon - start_lon) / steps

    # 3. Create the pattern
    # We move along the vector, but zigzag 'out' to the side to cover width
    # 0.02 degrees is roughly 2km width
    width_factor = 0.02

    for i in range(steps + 1):
        # Calculate the center point on the drift line
        center_lat = start_lat + (lat_step * i)
        center_lon = start_lon + (lon_step * i)

        # Zig (Right side of the flow)
        path.append([center_lat + width_factor, center_lon + width_factor])

        # Zag (Left side of the flow)
        path.append([center_lat - width_factor, center_lon - width_factor])

    return path
