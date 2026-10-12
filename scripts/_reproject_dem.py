# -*- coding: utf-8 -*-
"""Reproject Macau DEM TIF from local Macau Grid to WGS84."""
import sys
import numpy as np
import tifffile
from pyproj import Transformer

# 1. Read .tfw to get origin and pixel size
tfw_path = r'D:\MOData\DEM_with channel\DEM_with channel.tfw'
with open(tfw_path, 'r') as f:
    tfw = [float(line.strip()) for line in f.readlines()]
pixel_x, rot_y, rot_x, pixel_y, origin_x, origin_y = tfw
print(f'tfw: pixel=({pixel_x}, {pixel_y}) origin=({origin_x}, {origin_y}) rotations=({rot_x}, {rot_y})')

# 2. Read TIF data
tif_path = r'D:\MOData\DEM_with channel\DEM_with channel.tif'
data = tifffile.imread(tif_path)
print(f'TIF shape: {data.shape}, dtype: {data.dtype}')
height, width = data.shape

# 3. Build coordinate transformer (Macau Grid → WGS84)
macau_wkt = (
    'PROJCS["Observatorio_Meteorologico_1965_Macau_Grid",'
    'GEOGCS["GCS_Observatorio_Meteorologico_1965",'
    'DATUM["D_Observatorio_Meteorologico_1965",'
    'SPHEROID["International_1924",6378388.0,297.0]],'
    'PRIMEM["Greenwich",0.0],'
    'UNIT["Degree",0.0174532925199433]],'
    'PROJECTION["Transverse_Mercator"],'
    'PARAMETER["False_Easting",20000.0],'
    'PARAMETER["False_Northing",20000.0],'
    'PARAMETER["Central_Meridian",113.5364694444445],'
    'PARAMETER["Scale_Factor",1.0],'
    'PARAMETER["Latitude_Of_Origin",22.21239722222222],'
    'UNIT["Meter",1.0]]'
)
try:
    transformer = Transformer.from_crs(macau_wkt, "EPSG:4326", always_xy=True)
except Exception as e:
    print(f'pyproj init err: {e}')
    # Fall back: use proj string instead of WKT
    proj_str = "+proj=tmerc +lat_0=22.21239722222222 +lon_0=113.5364694444445 +k=1 +x_0=20000 +y_0=20000 +ellps=intl +units=m +no_defs"
    transformer = Transformer.from_crs(proj_str, "EPSG:4326", always_xy=True)

# 4. Build pixel-to-coordinate mapping for the new WGS84 TIF
# Compute lat/lng for the 4 corners of the image
# Pixel (0, 0) top-left → (origin_x, origin_y) in Macau Grid
corners_macaun = [
    (origin_x, origin_y),                                          # top-left
    (origin_x + width * pixel_x, origin_y),                        # top-right
    (origin_x, origin_y + height * pixel_y),                       # bottom-left
    (origin_x + width * pixel_x, origin_y + height * pixel_y),     # bottom-right
]
print(f'Corners Macau Grid: {corners_macaun}')
corners_wgs84 = [transformer.transform(x, y) for x, y in corners_macaun]
print(f'Corners WGS84: {corners_wgs84}')
# corners_wgs84 = [(lng, lat), ...]

# 5. Determine output TIF bounds (WGS84)
min_lng = min(c[0] for c in corners_wgs84)
max_lng = max(c[0] for c in corners_wgs84)
min_lat = min(c[1] for c in corners_wgs84)
max_lat = max(c[1] for c in corners_wgs84)
print(f'WGS84 bbox: lng=[{min_lng:.6f}, {max_lng:.6f}], lat=[{min_lat:.6f}, {max_lat:.6f}]')

# 6. Create output TIF in WGS84 with same resolution
# ~5m at lat 22.2° → ~5/111000/cos(22.2°pi/180) ≈ 4.86e-5 degrees
import math
meters_per_deg_lat = 111000  # approximate
meters_per_deg_lng = 111000 * math.cos(min_lat * math.pi / 180)  # at this latitude
deg_per_pixel_lat = 5.0 / meters_per_deg_lat
deg_per_pixel_lng = 5.0 / meters_per_deg_lng
new_height = int((max_lat - min_lat) / deg_per_pixel_lat)
new_width = int((max_lng - min_lng) / deg_per_pixel_lng)
print(f'Output TIF: {new_width} x {new_height} pixels, pixel size: {deg_per_pixel_lng:.2e} x {deg_per_pixel_lat:.2e} deg')

# 7. Reproject by sampling (nearest neighbor for speed)
print('Reprojecting (nearest neighbor)...')
src_xs = np.arange(width) * pixel_x + origin_x
src_ys = np.arange(height) * pixel_y + origin_y
src_X, src_Y = np.meshgrid(src_xs, src_ys)
src_X_flat = src_X.ravel()
src_Y_flat = src_Y.ravel()

# Transform all pixels to WGS84 (lng, lat)
print(f'  Transforming {len(src_X_flat)} pixels...')
sample_step = max(1, len(src_X_flat) // 50000)  # sample to keep memory OK
dst_lng, dst_lat = transformer.transform(src_X_flat[::sample_step], src_Y_flat[::sample_step])
print(f'  Sampled to {len(dst_lng)} points')

# Output data: full grid, indexed by (lat, lng)
out_data = np.zeros((new_height, new_width), dtype=data.dtype)
lat_idx = ((dst_lat - min_lat) / deg_per_pixel_lat).astype(int)
lng_idx = ((dst_lng - min_lng) / deg_per_pixel_lng).astype(int)
# Filter valid indices
valid = (lat_idx >= 0) & (lat_idx < new_height) & (lng_idx >= 0) & (lng_idx < new_width)
src_idx = np.arange(len(dst_lat)) * sample_step
out_data[lat_idx[valid], lng_idx[valid]] = data.ravel()[src_idx[valid]]
print(f'  Repopulated {valid.sum()} pixels (from {len(dst_lat)} samples)')

# 8. Write output TIF with proper GeoKeys
out_path = r'D:\MOData\DEM_with channel\DEM_with_channel_WGS84.tif'
# Use tifffile's geokeys support
tifffile.imwrite(
    out_path,
    out_data,
    photometric='minisblack',
    metadata={
        'ModelPixelScaleTag': (deg_per_pixel_lng, deg_per_pixel_lat, 0.0),
        'ModelTiepointTag': (0, 0, 0, min_lng, max_lat, 0),  # top-left = (lng, max_lat)
        'GeoKeyDirectoryTag': [
            1024, 1, 1, 2,    # GTModelType = 2 (geographic)
            1025, 1, 1, 2,    # GTRasterType = 2 (RasterPixelIsArea)
            2048, 1, 1, 4326, # GeographicType = 4326
        ],
        'GTCitationGeoKey': 'WGS84',
    },
)
print(f'Wrote: {out_path}')