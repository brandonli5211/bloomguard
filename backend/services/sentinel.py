"""
Sentinel Hub service for fetching satellite imagery and detecting algae blooms.
Implements NDCI (Normalized Difference Chlorophyll Index) analysis.
"""

import os
from typing import List, Optional
from pathlib import Path
import logging

try:
    from sentinelhub import (
        SHConfig,
        BBox,
        CRS,
        DataCollection,
        MimeType,
        SentinelHubRequest,
    )
    import numpy as np
    from PIL import Image

    SENTINELHUB_AVAILABLE = True
except ImportError:
    SENTINELHUB_AVAILABLE = False
    np = None
    Image = None

logger = logging.getLogger(__name__)

# Algae Evalscript: Red for NDCI > 0.2, Transparent for < 0.2
ALGAE_EVALSCRIPT = """
//VERSION=3
function setup() {
    return {
        input: [{
            bands: ["B04", "B05", "B08"]
        }],
        output: {
            bands: 4,
            sampleType: "AUTO"
        }
    };
}

function evaluatePixel(samples) {
    // Calculate NDCI (Normalized Difference Chlorophyll Index)
    // NDCI = (B05 - B04) / (B05 + B04)
    // B04 = Red, B05 = Red Edge 1, B08 = NIR
    
    const red = samples.B04;
    const redEdge = samples.B05;
    const nir = samples.B08;
    
    // Calculate NDCI
    const denominator = redEdge + red;
    const ndci = denominator != 0 ? (redEdge - red) / denominator : 0;
    
    // Threshold: NDCI > 0.2 indicates potential algae bloom (Red)
    // NDCI <= 0.2 is transparent
    if (ndci > 0.2) {
        // Return red color for high NDCI (algae bloom)
        return [1, 0, 0, 1]; // RGBA: Red, fully opaque
    } else {
        // Return transparent for low NDCI
        return [0, 0, 0, 0]; // RGBA: Transparent
    }
}
"""


def fetch_satellite_image(bbox: List[float]) -> str:
    """
    Fetch satellite image using Sentinel Hub API with Algae Evalscript.

    Args:
        bbox: List of 4 floats [min_x, min_y, max_x, max_y] in WGS84 coordinates

    Returns:
        str: Path to the generated image file, or fallback path if API fails

    Note:
        If Sentinel Hub API fails or credentials are not configured,
        returns path to static demo image: ./assets/demo_heatmap.png
    """
    # Validate bbox
    if not bbox or len(bbox) != 4:
        logger.warning("Invalid bbox provided, using fallback image")
        return _get_fallback_image_path()

    min_x, min_y, max_x, max_y = bbox

    # Check if Sentinel Hub credentials are available
    client_id = os.getenv("SENTINEL_CLIENT_ID")
    client_secret = os.getenv("SENTINEL_CLIENT_SECRET")

    if not SENTINELHUB_AVAILABLE:
        logger.warning("sentinelhub-py not available, using fallback image")
        return _get_fallback_image_path()

    if not client_id or not client_secret:
        logger.warning("Sentinel Hub credentials not configured, using fallback image")
        return _get_fallback_image_path()

    try:
        # Configure Sentinel Hub
        config = SHConfig()
        config.sh_client_id = client_id
        config.sh_client_secret = client_secret

        # Create bounding box (WGS84)
        bbox_obj = BBox(bbox=[min_x, min_y, max_x, max_y], crs=CRS.WGS84)

        # Create request
        request = SentinelHubRequest(
            evalscript=ALGAE_EVALSCRIPT,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=DataCollection.SENTINEL2_L2A,
                    time_interval=("2024-01-01", "2024-12-31"),  # Last year of data
                )
            ],
            responses=[SentinelHubRequest.output_response("default", MimeType.PNG)],
            bbox=bbox_obj,
            size=[512, 512],  # Image size
            config=config,
        )

        # Download the image
        image_data = request.get_data()[0]

        # Save to assets directory
        assets_dir = Path(__file__).parent.parent / "assets"
        assets_dir.mkdir(exist_ok=True)

        output_path = assets_dir / "sentinel_heatmap.png"

        # Handle image data (could be bytes or numpy array)
        if isinstance(image_data, bytes):
            # Direct PNG bytes
            with open(output_path, "wb") as f:
                f.write(image_data)
        elif np is not None and isinstance(image_data, np.ndarray):
            # Convert numpy array to PNG
            if Image is not None:
                # Normalize array values to 0-255 if needed
                if image_data.dtype != np.uint8:
                    # Assume values are 0-1, scale to 0-255
                    image_data = (image_data * 255).astype(np.uint8)

                # Handle RGBA format (4 channels)
                if len(image_data.shape) == 3 and image_data.shape[2] == 4:
                    img = Image.fromarray(image_data, "RGBA")
                elif len(image_data.shape) == 3:
                    img = Image.fromarray(image_data, "RGB")
                else:
                    img = Image.fromarray(image_data)

                img.save(output_path, "PNG")
            else:
                # Fallback if PIL not available
                raise ValueError("PIL/Pillow required for numpy array conversion")
        else:
            # Unknown format, try to write as-is
            with open(output_path, "wb") as f:
                f.write(image_data)

        logger.info(f"Successfully fetched satellite image: {output_path}")
        return str(output_path)

    except Exception as e:
        logger.error(f"Error fetching satellite image from Sentinel Hub: {e}")
        logger.info("Falling back to demo image")
        return _get_fallback_image_path()


def _get_fallback_image_path() -> str:
    """
    Get the path to the fallback demo image.
    Creates the assets directory if it doesn't exist.
    """
    assets_dir = Path(__file__).parent.parent / "assets"
    assets_dir.mkdir(exist_ok=True)

    fallback_path = assets_dir / "demo_heatmap.png"

    # If demo image doesn't exist, return the path anyway
    # (The frontend can handle missing images, or we'll create a placeholder)
    return str(fallback_path)
